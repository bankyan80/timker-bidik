import asyncio
import edge_tts
import os

TEXT = 'Selamat datang di TIMKER-BIDIK.ONLINE.<break time="700ms"/>Satu platform terintegrasi untuk pengelolaan data, monitoring, dan layanan pendidikan yang cepat, cerdas, dan efisien.<break time="700ms"/>Digital, terintegrasi, profesional.'

VOICE = "id-ID-ArdiNeural"
OUTPUT = r"C:\Users\Bank Yan\timker-bidik\public\intro-timker-bidik.mp3"

async def main():
    tts = edge_tts.Communicate(TEXT, VOICE, rate="+5%", pitch="+0Hz")
    await tts.save(OUTPUT)
    mb = os.path.getsize(OUTPUT) / 1024
    print(f"Saved: {OUTPUT} ({mb:.0f} KB)")

asyncio.run(main())
