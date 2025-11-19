# ✅ BACKDONOR (Arka Donör) – PDF’e Göre Tüm Gereksinimler

Aşağıdaki liste, Smile Hair Clinic Hackathon PDF’ine göre **BackDonor** ekranında bulunması gereken tüm teknik ve UX gereksinimlerinin eksiksiz özetidir.

---

## 1) 📸 Auto-Capture (Otomatik Çekim)

BackDonor ekranında otomatik çekim **zorunludur** ve şu üç koşul aynı anda sağlanmadan tetiklenmez:

### **Koşul 1 — Head / Back Area Detection aktif**
- Ense üstü ve arka yan bölge algılanmalı.
- Telefon, başın arkasına götürülmeli ve hedef bölge kadrajda olmalı.
- Target area % coverage sağlanmalı.

### **Koşul 2 — Phone Sensor Validation**
- Telefon arka bölgeyi net görecek şekilde tutulmalı.  
  - Pitch ≈ 70–100° (hafif eğimli dik)
  - Roll ±5° tolerans
- Kullanıcı, telefonun doğru kadrajı almasını görebilmeli. Görsel ve sesli yönlendirme sağlanmalı.

### **Koşul 3 — Stabilization Timer**
- Şartlar **700–1200 ms** stabil şekilde korunmalı.

### **Koşullar sağlanınca:**
- 3…2…1 geri sayım veya bip / radar sesi.
- Otomatik çekim.
- Haptic feedback + fallback vibrasyon.

---

## 2) 🧍‍♂️ Arka Bölge Pozisyonu Doğrulama (Back Area Guidance)

### **Kafa / Ense konumu**
- Ense üstü ve arka yan kadrajda olmalı.
- Çok kayarsa: “Move slightly up / down / left / right”

### **Telefon açısı**
- Pitch ≈ 70–100°  
- Roll ±5° tolerans

### **Uyarılar**
- “Telefonu başın arkasına getirin”
- “Arka bölgeyi kadrajlayın”
- “Hafif yukarı/aşağı hareket ettirin”

---

## 3) 📏 Uzaklık Doğrulama (Distance Validation)

- Arka bölge bounding box belirli MIN–MAX aralığında olmalı.
- Çok yakın → “Biraz geri çekin”
- Çok uzak → “Biraz yaklaşın”
- Amaç: arka bölge net ve doğru kadrajda olmalı.

---

## 4) 🎯 Overlay / Guide (Görsel Yönlendirme)

### **Görsel kılavuzlar**
- BackDonor silhouette / arka şablon overlay
- Ortada crosshair (merkez çizgisi)
- Doğru hizalandığında yeşile dönen UI

### **Dinamik feedback**
- Telefon eğimli → kırmızı
- Yaklaşıyor → sarı
- Tam doğru → yeşil

---

## 5) ⚠️ Wrong Direction Warnings

- Telefon yeterince arkada değil → “Telefonu başın arkasına getirin”
- Telefon eğik → uyarı
- Baş çok yukarı/aşağı → uyarı

---

## 6) 🔊 Ses & Haptic Feedback

- Doğru pozisyona yaklaşırken sesli feedback
- Otomatik çekim öncesi bipler veya alçalıp yükselen radar sesi
- Haptic feedback (varsa) + vibrasyon fallback

---

## 7) 🧭 Yakınlık Skoru (Capture Readiness Score)

PDF gereksinimi: “Doğru pozisyona ne kadar yakın olduğunu gösterme”

Score =  
- Arka bölge kadraj doğruluğu  
- Pitch / Roll stabilizasyonu  
- Uzaklık doğruluğu  

UI gösterimi: Progress bar / ring

---

## 8) 🔄 Akış Kontrolleri (Retake / Continue)

Fotoğraf çekilince:
- Preview ekranı
- “Retake”
- “Complete Capture” veya uygulama akışı sonu

5 adıma bağlı global akışla uyumlu.

---

## 9) 🧪 Teknik Gereklilikler

- Gyroscope + accelerometer kullanımı
- Realtime sensor + back area detection algoritması
- 30–60 FPS veri işleme
- Pitch/roll smoothing (low pass / Kalman)
- Dik / hafif eğimli konum stabilizasyon algoritması

---

## 10) 📂 Metadata Kaydı

BackDonor için kaydedilmesi önerilen veriler:

- pitch, roll  
- arka bölge bounding box  
- mesafe skoru  
- capture timestamp  
- aydınlık seviyesi (opsiyon)

---

## 🔥 Ultra Kısa CheckList

| Özellik | Durum |
|--------|-------|
| Back Area Detection | ✔ zorunlu |
| Phone Angle | ✔ pitch≈70–100°, roll≈0° |
| Auto Capture | ✔ |
| Stabilization Timer | ✔ |
| Distance Control | ✔ |
| Overlay | ✔ arka bölge silhouette |
| Wrong Direction Warning | ✔ |
| Haptic + Sound | ✔ |
| Countdown | ✔ |
| Readiness Score | ✔ |
| Consistent Framing | ✔ |
