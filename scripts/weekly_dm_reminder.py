#!/usr/bin/env python3
"""
주간 블로그 미작성자 DM 알림 스크립트

매주 일요일 오후 12시(한국 시간)에 실행되어
현재 주(월~일)에 아직 블로그를 작성하지 않은 사람에게 DM을 발송
"""

import os
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Set, Tuple, Dict
import discord


def get_current_week_range() -> Tuple[datetime, datetime]:
    """
    한국 시간 기준 이번주 월~일요일의 시작과 현재 시간을 UTC로 반환

    Returns:
        Tuple[datetime, datetime]: (이번주 월요일 00:00 UTC, 현재 시간 UTC)
    """
    # 현재 한국 시간 (UTC+9)
    kst_offset = timedelta(hours=9)
    now_utc = datetime.now(timezone.utc)
    now_kst = now_utc.astimezone(timezone(kst_offset))

    # 오늘이 무슨 요일인지 확인 (0=월요일, 6=일요일)
    today_weekday = now_kst.weekday()

    # 이번주 월요일까지의 일수 계산
    days_to_this_monday = today_weekday  # 이번주 월요일

    # 이번주 월요일 00:00:00 (KST)
    this_monday_kst = (now_kst - timedelta(days=days_to_this_monday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # UTC로 변환
    this_monday_utc = this_monday_kst.astimezone(timezone.utc)

    print(f"📅 체크 기간 (한국 시간):")
    print(f"   시작: {this_monday_kst.strftime('%Y-%m-%d %H:%M:%S')} KST")
    print(f"   현재: {now_kst.strftime('%Y-%m-%d %H:%M:%S')} KST")

    return this_monday_utc, now_utc


async def fetch_forum_threads(
    forum_channel: discord.ForumChannel,
    start_date: datetime,
    end_date: datetime
) -> List[discord.Thread]:
    """
    포럼 채널에서 지정된 기간의 스레드를 가져옴

    Args:
        forum_channel: Discord 포럼 채널
        start_date: 시작 일시 (UTC)
        end_date: 종료 일시 (UTC)

    Returns:
        List[discord.Thread]: 스레드 목록
    """
    threads_list = []

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

        threads_list.append(thread)
        print(f"   ✅ '{thread.name}' by {thread.owner.display_name if thread.owner else 'Unknown'}")

    print(f"\n📊 총 {len(threads_list)}개의 글이 기간 내에 작성됨")
    return threads_list


def analyze_threads(
    threads: List[discord.Thread],
    target_users: Set[str],
    guild: discord.Guild
) -> Tuple[Dict[str, discord.Member], Dict[str, discord.Member]]:
    """
    스레드를 분석하여 작성자와 미작성자를 구분

    Args:
        threads: 스레드 목록
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
    for thread in threads:
        if thread.owner:
            username = thread.owner.name
            if username in target_users:
                authors[username] = thread.owner

    # 미작성자
    non_authors_usernames = target_users - set(authors.keys())
    non_authors = {username: target_members[username] for username in non_authors_usernames if username in target_members}

    print(f"\n📊 분석 결과:")
    print(f"   작성자: {len(authors)}명")
    print(f"   미작성자: {len(non_authors)}명")

    return authors, non_authors


async def send_dm_to_member(member: discord.Member, message: str) -> bool:
    """
    특정 멤버에게 DM을 전송

    Args:
        member: Discord 멤버
        message: 전송할 메시지

    Returns:
        bool: 성공 여부
    """
    try:
        await member.send(message)
        print(f"   ✅ DM 전송 완료: {member.display_name}")
        return True
    except discord.Forbidden:
        print(f"   ⚠️  DM 전송 실패 (권한 없음): {member.display_name}")
        return False
    except discord.HTTPException as e:
        print(f"   ⚠️  DM 전송 실패 (HTTP 오류): {member.display_name} - {e}")
        return False
    except Exception as e:
        print(f"   ⚠️  DM 전송 실패 (기타 오류): {member.display_name} - {e}")
        return False


async def send_dms_to_non_authors(non_authors: Dict[str, discord.Member], start_date: datetime):
    """
    미작성자들에게 DM을 전송

    Args:
        non_authors: 미작성자 딕셔너리
        start_date: 이번주 시작일
    """
    if not non_authors:
        print("\n✅ 모두 블로그를 작성했습니다! DM을 보낼 필요가 없습니다.")
        return

    kst_offset = timedelta(hours=9)
    start_kst = start_date.astimezone(timezone(kst_offset))

    # DM 메시지 작성
    dm_message = f"""안녕하세요! 👋

이번주 ({start_kst.strftime('%Y-%m-%d')} 월요일부터) 아직 블로그 포스트를 작성하지 않으셨네요.

Blog-Or-Death 챌린지를 진행 중이니, 이번 주 일요일까지 블로그를 작성해주세요! 💪

화이팅! 🔥"""

    print(f"\n📨 미작성자 {len(non_authors)}명에게 DM 전송 중...")

    success_count = 0
    fail_count = 0

    for username, member in non_authors.items():
        success = await send_dm_to_member(member, dm_message)
        if success:
            success_count += 1
        else:
            fail_count += 1

        # DM 전송 간 짧은 딜레이 (Rate Limit 방지)
        await asyncio.sleep(1)

    print(f"\n📊 DM 전송 결과:")
    print(f"   ✅ 성공: {success_count}명")
    print(f"   ⚠️  실패: {fail_count}명")


async def run_weekly_dm_check():
    """주간 DM 체크 실행"""
    print("🚀 주간 블로그 미작성자 DM 알림 시작\n")

    # 환경 변수 확인
    discord_token = os.getenv("DISCORD_TOKEN")
    forum_channel_id_str = os.getenv("DISCORD_CHANNEL_ID")
    target_users_str = os.getenv("TARGET_USERS")


    if not discord_token:
        print("❌ DISCORD_TOKEN 환경 변수가 설정되지 않았습니다.")
        return

    if not forum_channel_id_str:
        print("❌ DISCORD_CHANNEL_ID 환경 변수가 설정되지 않았습니다.")
        return

    if not target_users_str:
        print("❌ TARGET_USERS 환경 변수가 설정되지 않았습니다.")
        return

    try:
        forum_channel_id = int(forum_channel_id_str)
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

            # 서버 정보
            guild = forum_channel.guild

            # 이번주 월~현재 범위 계산
            start_date, end_date = get_current_week_range()

            # 포럼 스레드 가져오기
            threads = await fetch_forum_threads(forum_channel, start_date, end_date)

            # 스레드 분석
            authors, non_authors = analyze_threads(threads, target_users, guild)

            # 미작성자에게 DM 전송
            await send_dms_to_non_authors(non_authors, start_date)

            print(f"\n✅ 모든 작업 완료!")

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
    asyncio.run(run_weekly_dm_check())


if __name__ == "__main__":
    main()
