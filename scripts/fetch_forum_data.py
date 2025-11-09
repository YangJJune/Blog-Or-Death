import discord
import os
import json
import sys
import re  # (Goal 1) URL 추출을 위해 임포트
import httpx # (Goal 2) 웹페이지 요청을 위해 임포트
from bs4 import BeautifulSoup # (Goal 2) HTML 파싱을 위해 임포트

# --- 설정 ---
TOKEN = os.environ.get('DISCORD_TOKEN')
try:
    CHANNEL_ID = os.environ.get('DISCORD_CHANNEL_ID')
except ValueError:
    print("❌ FORUM_CHANNEL_ID가 올바른 숫자 형식이 아닙니다.", file=sys.stderr)
    sys.exit(1)

OUTPUT_DIR = os.path.join(os.getcwd(), 'data')
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'forum-posts.json')

# (Goal 2) 웹사이트 스크래핑 시 봇 차단을 피하기 위한 User-Agent
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
}
# ---

# --- 봇 권한 설정 ---
intents = discord.Intents.default()
intents.guilds = True
intents.messages = True
intents.message_content = True # content를 읽기 위해 필수!

client = discord.Client(intents=intents)
# ---


async def get_og_image(session: httpx.AsyncClient, url: str) -> str | None:
    """(Goal 2) 
    웹페이지 URL에서 Open Graph 이미지(썸네일)를 추출합니다.
    """
    if not url:
        return None
    
    try:
        # 타임아웃을 10초로 설정
        response = await session.get(url, follow_redirects=True, timeout=10.0)
        response.raise_for_status() # 4xx, 5xx 에러 시 예외 발생
        
        # HTML 파싱
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 'og:image' 메타 태그 찾기
        og_image_tag = soup.find('meta', property='og:image')
        
        if og_image_tag and og_image_tag.get('content'):
            return og_image_tag['content'] # 썸네일 URL 반환
            
        return None
    except httpx.HTTPStatusError as e:
        print(f"  (HTTP 오류) {url}: {e.response.status_code}", file=sys.stderr)
        return None
    except Exception as e:
        # 타임아웃, 연결 오류 등 모든 예외 처리
        print(f"  (썸네일 탐색 오류) {url}: {e}", file=sys.stderr)
        return None


async def fetch_data():
    """데이터를 가져와 JSON 파일로 저장하는 메인 로직"""
    print(f"'{client.user}'로 로그인했습니다.")
    
    try:
        channel = await client.fetch_channel(CHANNEL_ID)
    except (discord.NotFound, discord.Forbidden) as e:
        print(f"❌ 채널(ID: {CHANNEL_ID})을 찾을 수 없거나 접근 권한이 없습니다: {e}", file=sys.stderr)
        return
    
    if not isinstance(channel, discord.ForumChannel):
        print(f"❌ 해당 채널은 포럼 채널이 아닙니다. (타입: {type(channel)})", file=sys.stderr)
        return

    print(f"'{channel.name}' 포럼에서 스레드를 가져오는 중...")
    
    active_threads = channel.threads
    archived_threads = [thread async for thread in channel.archived_threads(limit=None)]
    all_threads = active_threads + archived_threads
    
    print(f"총 {len(all_threads)}개의 스레드를 찾았습니다.")
    
    forum_data = []
    
    # (Goal 2) HTTP 요청을 위한 비동기 클라이언트 세션 생성
    async with httpx.AsyncClient(headers=HEADERS) as session:
        for thread in all_threads:
            try:
                starter_message = await thread.fetch_message(thread.id)
            except (discord.NotFound, discord.Forbidden):
                print(f"(경고) 스레드 '{thread.name}'의 시작 메시지를 찾을 수 없습니다.")
                continue
            
            # --- 1. Discord 썸네일 (기본값) ---
            # (Goal 2) 요청: "thumbnail이 discord thread에서 확인 가능할때는 무시"
            discord_thumbnail = None
            if starter_message.attachments:
                for att in starter_message.attachments:
                    if att.content_type and att.content_type.startswith('image/'):
                        discord_thumbnail = att.url
                        break
            
            # --- 2. content에서 URL 추출 (Goal 1) ---
            content = starter_message.content
            extracted_url = None
            
            # 정규식을 사용해 content에서 첫 번째 http/https URL을 찾습니다.
            url_match = re.search(r"https?://[^\s]+", content)
            if url_match:
                extracted_url = url_match.group(0)

            # --- 3. 최종 썸네일 결정 (Goal 2) ---
            final_thumbnail = discord_thumbnail # 일단 Discord 썸네일로 설정

            if not final_thumbnail and extracted_url:
                # Discord 썸네일이 없고, 추출한 URL이 있다면
                print(f"-> Discord 썸네일 없음. '{thread.name}'의 썸네일 탐색 시도: {extracted_url}")
                og_image = await get_og_image(session, extracted_url)
                if og_image:
                    final_thumbnail = og_image
                    print(f"  -> 썸네일 찾음: {final_thumbnail}")
                else:
                    print("  -> 썸네일 없음")
            
            # --- 4. JSON 데이터 구성 ---
            forum_data.append({
                "id": thread.id,
                "title": thread.name,
                "content": content, # 전체 본문
                "author": starter_message.author.name,
                "author_avatar": starter_message.author.display_avatar.url,
                
                # (Goal 1) 'url' 필드를 Discord URL 대신 추출한 URL로 교체
                "url": extracted_url, 
                
                # (Goal 2) 최종 썸네일
                "thumbnail": final_thumbnail, 
                
                "createdAt": thread.created_at.isoformat() if thread.created_at else None,
            })

    # 3. JSON 파일로 저장
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(forum_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 데이터가 {OUTPUT_FILE}에 성공적으로 저장되었습니다.")


@client.event
async def on_ready():
    try:
        await fetch_data()
    except Exception as e:
        print(f"❌ 스크립트 실행 중 치명적인 오류 발생: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        print("작업 완료. 봇을 종료합니다.")
        await client.close()

# --- 메인 실행 ---
if __name__ == "__main__":
    if not TOKEN or CHANNEL_ID == 0:
        print("❌ 환경 변수 DISCORD_TOKEN 또는 FORUM_CHANNEL_ID가 설정되지 않았습니다.", file=sys.stderr)
        sys.exit(1)
    
    try:
        client.run(TOKEN)
    except discord.errors.LoginFailure:
        print("❌ Discord 로그인 실패. 토큰이 올바른지 확인하세요.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ 봇 실행 중 오류 발생: {e}", file=sys.stderr)
        sys.exit(1)