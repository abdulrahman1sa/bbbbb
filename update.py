"""
سكريبت التحديث التلقائي
يجلب أحدث الصور من القناة ويضيفها للأرشيف دون تكرار
"""
import json, requests, re, time
from bs4 import BeautifulSoup
from pathlib import Path

CHANNEL     = "Bandaralgaloud"
OUTPUT      = Path(__file__).parent / "messages.json"
SITE_DATA   = Path(__file__).parent / "site" / "src" / "app" / "data.json"
HEADERS     = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"}

def scrape_page(url):
    resp = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(resp.text, "html.parser")
    posts, oldest_id = [], None
    for msg in soup.find_all("div", class_="tgme_widget_message_wrap"):
        tag = msg.find("div", class_="tgme_widget_message")
        if not tag or not tag.has_attr("data-post"):
            continue
        msg_id = tag["data-post"].split("/")[-1]
        oldest_id = msg_id
        photos = []
        for p in msg.find_all("a", class_="tgme_widget_message_photo_wrap"):
            m = re.search(r"background-image:url\(['\"]?(.*?)['\"]?\)", p.get("style", ""))
            if m: photos.append(m.group(1))
        text_tag = msg.find("div", class_="tgme_widget_message_text")
        time_tag = msg.find("time")
        posts.append({
            "id": msg_id,
            "text": text_tag.get_text("\n").strip() if text_tag else "",
            "photos": photos,
            "has_video": bool(msg.find("video")),
            "date": time_tag.get("datetime", "") if time_tag else ""
        })
    return posts, oldest_id

def update(refresh_pages=5):
    existing = json.loads(OUTPUT.read_text("utf-8")) if OUTPUT.exists() else []
    data_map = {m["id"]: m for m in existing}

    print(f"الأرشيف الحالي: {len(existing)} منشور")
    url = f"https://t.me/s/{CHANNEL}"
    pages_scraped = 0
    updated_count = 0
    new_count = 0

    while pages_scraped < refresh_pages:
        posts, oldest_id = scrape_page(url)
        if not posts:
            break
        
        for p in posts:
            if p["id"] in data_map:
                # Update photos even if ID exists (to refresh links)
                if data_map[p["id"]]["photos"] != p["photos"]:
                    data_map[p["id"]]["photos"] = p["photos"]
                    updated_count += 1
            else:
                data_map[p["id"]] = p
                new_count += 1
        
        url = f"https://t.me/s/{CHANNEL}?before={oldest_id}"
        pages_scraped += 1
        print(f"تم مسح الصفحة {pages_scraped}...")
        time.sleep(1)

    all_data = list(data_map.values())
    all_data.sort(key=lambda x: x.get("date",""), reverse=True)
    
    OUTPUT.write_text(json.dumps(all_data, ensure_ascii=False, indent=2), "utf-8")
    SITE_DATA.write_text(json.dumps(all_data, ensure_ascii=False, indent=2), "utf-8")
    
    print(f"النتيجة: {new_count} منشور جديد، {updated_count} منشور تم تحديث روابطه.")


if __name__ == "__main__":
    update()
