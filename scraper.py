import requests
from bs4 import BeautifulSoup
import json
import re
import time
import sys

def scrape_all(channel_username):
    base_url = f"https://t.me/s/{channel_username}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
    
    messages = {}   # dict by id to avoid duplicates
    current_url = base_url
    page = 0
    consecutive_empty = 0

    while True:
        page += 1
        print(f"  صفحة {page} — رابط: {current_url}", flush=True)
        
        try:
            resp = requests.get(current_url, headers=headers, timeout=15)
        except Exception as e:
            print(f"  خطأ في الاتصال: {e}", flush=True)
            time.sleep(3)
            continue
        
        if resp.status_code != 200:
            print(f"  حالة HTTP: {resp.status_code} — توقف", flush=True)
            break

        soup = BeautifulSoup(resp.text, 'html.parser')
        elements = soup.find_all('div', class_='tgme_widget_message_wrap')

        if not elements:
            consecutive_empty += 1
            print("  لا توجد عناصر في هذه الصفحة", flush=True)
            if consecutive_empty >= 3:
                break
            time.sleep(2)
            continue

        consecutive_empty = 0
        new_count = 0

        for msg in elements:
            id_tag = msg.find('div', class_='tgme_widget_message')
            if not id_tag or not id_tag.has_attr('data-post'):
                continue
            msg_id = id_tag['data-post'].split('/')[-1]
            if msg_id in messages:
                continue

            photos = []
            for p in msg.find_all('a', class_='tgme_widget_message_photo_wrap'):
                match = re.search(r"background-image:url\(['\"]?(.*?)['\"]?\)", p.get('style', ''))
                if match:
                    photos.append(match.group(1))

            text_tag = msg.find('div', class_='tgme_widget_message_text')
            text = text_tag.get_text(separator='\n').strip() if text_tag else ""

            time_tag = msg.find('time')
            date = time_tag.get('datetime', '') if time_tag else ""

            video_tag = msg.find('video') or msg.find('i', class_='tgme_widget_message_video_thumb')
            has_video = bool(video_tag)

            if photos or text:
                messages[msg_id] = {
                    "id": msg_id,
                    "text": text,
                    "photos": photos,
                    "has_video": has_video,
                    "date": date
                }
                new_count += 1

        oldest = elements[0].find('div', class_='tgme_widget_message')
        if oldest and oldest.has_attr('data-post'):
            oldest_id = oldest['data-post'].split('/')[-1]
            current_url = f"{base_url}?before={oldest_id}"
        else:
            print("  لا يوجد رابط للصفحة السابقة — انتهى السحب", flush=True)
            break

        total = len(messages)
        print(f"  +{new_count} جديدة | المجموع حتى الآن: {total}", flush=True)

        if new_count == 0:
            consecutive_empty += 1
            if consecutive_empty >= 3:
                print("  وصلنا لنهاية الأرشيف", flush=True)
                break

        time.sleep(1.2)   # احترام معدل الطلبات

    return list(messages.values())

if __name__ == "__main__":
    channel = "Bandaralgaloud"
    
    print("=" * 50)
    print(f"  جلب جميع منشورات قناة: @{channel}")
    print("=" * 50)
    
    data = scrape_all(channel)

    # ترتيب تنازلي حسب التاريخ (الأحدث أولاً)
    data.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    photo_count = sum(len(m["photos"]) for m in data)
    
    print("=" * 50)
    print(f"  المنشورات المجلوبة: {len(data)}")
    print(f"  إجمالي الصور:       {photo_count}")
    print("=" * 50)
    
    with open("messages.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("  تم الحفظ في messages.json ✓")
