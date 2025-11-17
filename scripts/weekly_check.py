#!/usr/bin/env python3
"""
주간 블로그 작성 현황 체크 스크립트

Discord 포럼 채널에서 지난주 월~일요일에 작성된 글을 분석하여
대상자 중 작성한 사람과 작성하지 않은 사람을 구분하고,
HOT 글 Top 3를 Discord로 알림
"""

import os
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Set, Tuple, Dict
import discord
from discord import Embed, Color


def get_last_week_range() -> Tuple[datetime, datetime]:
    """
    한국 시간 기준 지난주 월~일요일의 시작과 끝 시간을 UTC로 반환

    Returns:
        Tuple[datetime, datetime]: (지난주 월요일 00:00 UTC, 지난주 일요일 23:59:59 UTC)
    """
    # 현재 한국 시간 (UTC+9)
    kst_offset = timedelta(hours=9)
    now_utc = datetime.now(timezone.utc)
    now_kst = now_utc.astimezone(timezone(kst_offset))

    # 오늘이 무슨 요일인지 확인 (0=월요일, 6=일요일)
    today_weekday = now_kst.weekday()

    # 지난주 월요일까지의 일수 계산
    days_to_last_monday = today_weekday + 7  # 지난주 월요일

    # 지난주 월요일 00:00:00 (KST)
    last_monday_kst = (now_kst - timedelta(days=days_to_last_monday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # 지난주 일요일 23:59:59 (KST)
    last_sunday_kst = last_monday_kst + timedelta(days=6, hours=23, minutes=59, seconds=59)

    # UTC로 변환
    last_monday_utc = last_monday_kst.astimezone(timezone.utc)
    last_sunday_utc = last_sunday_kst.astimezone(timezone.utc)

    print(f"📅 체크 기간 (한국 시간):")
    print(f"   시작: {last_monday_kst.strftime('%Y-%m-%d %H:%M:%S')} KST")
    print(f"   종료: {last_sunday_kst.strftime('%Y-%m-%d %H:%M:%S')} KST")

    return last_monday_utc, last_sunday_utc


class ThreadInfo:
    """포럼 스레드 정보"""
    def __init__(self, thread: discord.Thread, message_count: int, reaction_count: int):
        self.thread = thread
        self.author = thread.owner
        self.created_at = thread.created_at
        self.message_count = message_count
        self.reaction_count = reaction_count
        self.hot_score = message_count + reaction_count
        self.title = thread.name
        self.url = thread.jump_url

    def __repr__(self):
        return f"ThreadInfo(title={self.title}, author={self.author}, hot_score={self.hot_score})"


async def fetch_forum_threads(
    forum_channel: discord.ForumChannel,
    start_date: datetime,
    end_date: datetime
) -> List[ThreadInfo]:
    """
    포럼 채널에서 지정된 기간의 스레드 정보를 가져옴

    Args:
        forum_channel: Discord 포럼 채널
        start_date: 시작 일시 (UTC)
        end_date: 종료 일시 (UTC)

    Returns:
        List[ThreadInfo]: 스레드 정보 목록
    """
    threads_info = []

    print(f"\n📖 포럼 채널 '{forum_channel.name}'에서 스레드 가져오는 중...")

    # 활성 스레드와 아카이브된 스레드 모두 가져오기
    all_threads = []

    # 활성 스레드
    all_threads.extend(forum_channel.threads)

    # 아카이브된 스레드
    async for thread in forum_channel.archived_threads(limit=None):
        all_threads.append(thread)

    print(f"   총 {len(all_threads)}개의 스레드 발견")

    for thread in all_threads:
        # 스레드 생성 시간 확인
        if not thread.created_at:
            continue

        # UTC aware datetime으로 변환
        thread_created = thread.created_at
        if thread_created.tzinfo is None:
            thread_created = thread_created.replace(tzinfo=timezone.utc)

        # 기간 확인
        if not (start_date <= thread_created <= end_date):
            continue

        try:
            # 메시지 수 계산 (대략적인 수)
            message_count = 0
            async for _ in thread.history(limit=None):
                message_count += 1

            # 시작 메시지의 반응 수 계산
            reaction_count = 0
            if thread.starter_message:
                starter_msg = thread.starter_message
            else:
                # starter_message가 없으면 첫 메시지 가져오기
                try:
                    starter_msg = await thread.fetch_message(thread.id)
                except:
                    starter_msg = None

            if starter_msg and starter_msg.reactions:
                for reaction in starter_msg.reactions:
                    reaction_count += reaction.count

            thread_info = ThreadInfo(thread, message_count, reaction_count)
            threads_info.append(thread_info)

            print(f"   ✅ '{thread.name}' by {thread.owner.display_name if thread.owner else 'Unknown'} "
                  f"(메시지: {message_count}, 반응: {reaction_count}, HOT: {thread_info.hot_score})")

        except Exception as e:
            print(f"   ⚠️  스레드 '{thread.name}' 처리 중 오류: {e}")
            continue

    print(f"\n📊 총 {len(threads_info)}개의 글이 기간 내에 작성됨")
    return threads_info


def analyze_threads(
    threads: List[ThreadInfo],
    target_users: Set[str],
    guild: discord.Guild
) -> Tuple[Dict[str, discord.Member], Dict[str, discord.Member]]:
    """
    스레드를 분석하여 작성자와 미작성자를 구분

    Args:
        threads: 스레드 정보 목록
        target_users: 대상 사용자 username 목록
        guild: Discord 서버

    Returns:
        Tuple[Dict[str, discord.Member], Dict[str, discord.Member]]: (작성한 멤버, 작성하지 않은 멤버)
    """
    # username으로 멤버 찾기
    target_members = {}
    for username in target_users:
        member = discord.utils.get(guild.members, name=username)
        if member:
            target_members[username] = member
        else:
            print(f"⚠️  '{username}' 멤버를 찾을 수 없습니다.")

    # 작성한 멤버 찾기
    authors = {}
    for thread_info in threads:
        if thread_info.author:
            username = thread_info.author.name
            if username in target_users:
                authors[username] = thread_info.author

    # 미작성자
    non_authors_usernames = target_users - set(authors.keys())
    non_authors = {username: target_members[username] for username in non_authors_usernames if username in target_members}

    print(f"\n📊 분석 결과:")
    print(f"   작성자: {len(authors)}명")
    print(f"   미작성자: {len(non_authors)}명")

    return authors, non_authors


def get_top_hot_threads(threads: List[ThreadInfo], top_n: int = 3) -> List[ThreadInfo]:
    """
    HOT 스코어 기준 상위 N개 스레드 반환

    Args:
        threads: 스레드 정보 목록
        top_n: 상위 N개

    Returns:
        List[ThreadInfo]: HOT 스코어 상위 스레드 목록
    """
    sorted_threads = sorted(threads, key=lambda x: x.hot_score, reverse=True)
    return sorted_threads[:top_n]


def create_embed(
    authors: Dict[str, discord.Member],
    non_authors: Dict[str, discord.Member],
    start_date: datetime,
    end_date: datetime
) -> Embed:
    """Discord Embed 메시지 생성 (작성 현황만)"""
    kst_offset = timedelta(hours=9)
    start_kst = start_date.astimezone(timezone(kst_offset))
    end_kst = end_date.astimezone(timezone(kst_offset))

    # Embed 색상 결정 (모두 작성했으면 녹색, 아니면 주황색)
    color = Color.green() if len(non_authors) == 0 else Color.orange()

    embed = Embed(
        title="📝 주간 블로그 작성 현황",
        description=f"**기간**: {start_kst.strftime('%Y-%m-%d')} ~ {end_kst.strftime('%Y-%m-%d')} (KST)",
        color=color,
        timestamp=datetime.now(timezone.utc)
    )

    # # 작성한 사람 목록 (서버 닉네임 사용)
    # if authors:
    #     authors_list = "\n".join([
    #         f"({member.display_name})"
    #         for username, member in sorted(authors.items(), key=lambda x: x[1].display_name)
    #     ])
    #     embed.add_field(
    #         name=f"✍️ 작성 완료 ({len(authors)}명)",
    #         value=authors_list,
    #         inline=False
    #     )
    # else:
    #     embed.add_field(
    #         name=f"✍️ 작성 완료 (0명)",
    #         value="작성한 사람이 없습니다.",
    #         inline=False
    #     )

    # 작성하지 않은 사람 목록 (서버 닉네임 사용)
    if non_authors:
        non_authors_list = "\n".join([
            f"- {member.display_name}"
            for username, member in sorted(non_authors.items(), key=lambda x: x[1].display_name)
        ])
        embed.add_field(
            name=f"⚠️ 미작성 ({len(non_authors)}명)",
            value=non_authors_list,
            inline=False
        )
    else:
        embed.add_field(
            name=f"⚠️ 미작성 (0명)",
            value="모두 작성했습니다! 🎉",
            inline=False
        )

    embed.set_footer(text="Blog-Or-Death Weekly Check")

    return embed


def create_hot_thread_embed(thread_info: ThreadInfo, rank: int) -> Embed:
    """개별 HOT 글 임베드 생성"""
    medals = ["🥇", "🥈", "🥉"]
    medal = medals[rank - 1] if rank <= len(medals) else f"{rank}위"

    # 순위별 색상
    colors = [Color.gold(), Color.from_rgb(192, 192, 192), Color.from_rgb(205, 127, 50)]  # 금, 은, 동
    color = colors[rank - 1] if rank <= len(colors) else Color.blue()

    embed = Embed(
        title=f"{medal} {thread_info.title}",
        url=thread_info.url,
        description=f"이번 주 HOT 글 {rank}위",
        color=color,
        timestamp=datetime.now(timezone.utc)
    )

    # 작성자 정보
    if thread_info.author:
        author_name = thread_info.author.display_name
        author_avatar = thread_info.author.display_avatar.url
        embed.set_author(name=author_name, icon_url=author_avatar)

    # 통계 정보
    embed.add_field(name="💬 댓글", value=str(thread_info.message_count), inline=True)
    embed.add_field(name="❤️ 반응", value=str(thread_info.reaction_count), inline=True)

    # 썸네일 (작성자 프로필 사진)
    if thread_info.author:
        embed.set_thumbnail(url=thread_info.author.display_avatar.url)

    embed.set_footer(text=f"Blog-Or-Death | HOT 글 Top {rank}")

    return embed


async def run_weekly_check():
    """주간 체크 실행"""
    print("🚀 주간 블로그 작성 현황 체크 시작\n")

    # 환경 변수 확인
    discord_token = os.getenv("DISCORD_TOKEN")
    forum_channel_id_str = os.getenv("DISCORD_CHANNEL_ID")
    notification_channel_id_str = os.getenv("DISCORD_NOTI_CHANNEL_ID")
    target_users_str = os.getenv("TARGET_USERS")
    

    if not discord_token:
        print("❌ DISCORD_TOKEN 환경 변수가 설정되지 않았습니다.")
        return

    if not forum_channel_id_str:
        print("❌ FORUM_CHANNEL_ID 환경 변수가 설정되지 않았습니다.")
        return

    if not notification_channel_id_str:
        print("❌ DISCORD_CHANNEL_ID 환경 변수가 설정되지 않았습니다.")
        return

    if not target_users_str:
        print("❌ TARGET_USERS 환경 변수가 설정되지 않았습니다.")
        return

    try:
        forum_channel_id = int(forum_channel_id_str)
        notification_channel_id = int(notification_channel_id_str)
    except ValueError:
        print(f"❌ 채널 ID가 올바른 숫자가 아닙니다.")
        return

    # 대상 사용자 목록 파싱 (쉼표로 구분, 공백 제거)
    target_users = set(user.strip() for user in target_users_str.split(",") if user.strip())
    print(f"👥 대상 사용자 ({len(target_users)}명): {', '.join(sorted(target_users))}\n")

    # Discord Bot 설정
    intents = discord.Intents.default()
    intents.message_content = True
    intents.members = True
    intents.guilds = True

    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f"✅ Discord Bot 로그인: {client.user}")

        try:
            # 포럼 채널 가져오기
            forum_channel = client.get_channel(forum_channel_id)
            if not forum_channel or not isinstance(forum_channel, discord.ForumChannel):
                print(f"❌ 포럼 채널을 찾을 수 없습니다: {forum_channel_id}")
                await client.close()
                return

            # 알림 채널 가져오기
            notification_channel = client.get_channel(notification_channel_id)
            if not notification_channel:
                print(f"❌ 알림 채널을 찾을 수 없습니다: {notification_channel_id}")
                await client.close()
                return

            # 서버 정보
            guild = forum_channel.guild

            # 지난주 월~일요일 범위 계산
            start_date, end_date = get_last_week_range()

            # 포럼 스레드 가져오기
            threads = await fetch_forum_threads(forum_channel, start_date, end_date)

            if not threads:
                print("⚠️  지난주에 작성된 글이 없습니다.")
                # 빈 결과로 메시지 전송
                embed = create_embed({}, dict.fromkeys(target_users, None), start_date, end_date)
                await notification_channel.send(embed=embed)
                await client.close()
                return

            # 스레드 분석
            authors, non_authors = analyze_threads(threads, target_users, guild)

            # HOT 글 Top 3
            hot_threads = get_top_hot_threads(threads, top_n=3)
            print(f"\n🔥 HOT 글 Top {len(hot_threads)}:")
            for i, thread_info in enumerate(hot_threads, 1):
                print(f"   {i}. {thread_info.title} (HOT: {thread_info.hot_score})")

            # Discord Embed 생성
            main_embed = create_embed(authors, non_authors, start_date, end_date)

            # 메시지 전송 - 메인 임베드
            await notification_channel.send(embed=main_embed)
            print(f"\n✅ 메인 메시지 전송 완료: #{notification_channel.name}")

            # HOT 글 임베드 전송
            if hot_threads:
                print(f"🔥 HOT 글 임베드 전송 중...")
                for i, thread_info in enumerate(hot_threads, 1):
                    hot_embed = create_hot_thread_embed(thread_info, i)
                    await notification_channel.send(embed=hot_embed)
                    print(f"   ✅ {i}위 임베드 전송 완료")

            print(f"\n✅ 모든 메시지 전송 완료!")

        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await client.close()

    try:
        await client.start(discord_token)
    except discord.LoginFailure:
        print("❌ Discord Bot 로그인 실패. 토큰을 확인해주세요.")
    except Exception as e:
        print(f"❌ Discord Bot 오류: {e}")


def main():
    """메인 함수"""
    asyncio.run(run_weekly_check())


if __name__ == "__main__":
    main()
