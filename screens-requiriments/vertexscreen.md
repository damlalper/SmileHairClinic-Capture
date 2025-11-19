# ✅ VERTEX (Tepe Kısmı) – PDF’e Göre Tüm Gereksinimler

Aşağıdaki liste, Smile Hair Clinic Hackathon PDF’ine göre **Vertex** ekranında bulunması gereken tüm teknik ve UX gereksinimlerinin eksiksiz özetidir.

---

## 1) 📸 Auto-Capture (Otomatik Çekim)

Vertex ekranında otomatik çekim **zorunludur** ve şu üç koşul aynı anda sağlanmadan tetiklenmez:

### **Koşul 1 — Face / Head Detection aktif**
- Kafa tepe bölgesi algılanmalı.
- Telefon, başın **üzerinde** ve tepe derisi kadrajda olmalı.
- Target area % coverage sağlanmalı.

### **Koşul 2 — Phone Sensor Validation**
- Telefon **başın üzerinde** ve neredeyse dik (pitch ≈ 90°) olmalı.  
- Roll ±5° tolerans ile stabil olmalı.
- Kullanıcının telefonu başın ortasına hizalayabilmesi için görsel ve sesli yönlendirme sağlanmalı.

### **Koşul 3 — Stabilization Timer**
- Şartlar **700–1200 ms** stabil şekilde korunmalı.

### **Koşullar sağlanınca:**
- 3…2…1 geri sayım veya bip / radar sesi.
- Otomatik çekim.
- Haptic feedback + fallback vibrasyon.

---

## 2) 🧍‍♂️ Kafa Pozisyonu Doğrulama (Head Position Guidance)

### **Kafa konumu**
- Tepe bölgesi görüntünün ortasında olmalı.
- Çok kayarsa: “Move slightly forward / backward / left / right”

### **Kafa açısı**
- Pitch ≈ 90° (telefon neredeyse dik)
- Roll ±5° tolerans

### **Uyarılar**
- “Telefonu başın üzerine hizalayın”
- “Başın ortasını kadrajlayın”

---

## 3) 📏 Uzaklık Doğrulama (Distance Validation)

- Kafa bounding box belirli MIN–MAX aralığında olmalı.
- Çok yakın → “Biraz geri çekin”
- Çok uzak → “Biraz yaklaşın”
- Amaç: tepe derisi net ve doğru kadrajda olmalı.

---

## 4) 🎯 Overlay / Guide (Görsel Yönlendirme)

### **Görsel kılavuzlar**
- Head top silhouette / tepe şablonu.
- Ortada crosshair (merkez çizgisi).
- Doğru hizalandığında yeşile dönen UI.

### **Dinamik feedback**
- Telefon eğimli → kırmızı
- Yaklaşıyor → sarı
- Tam doğru → yeşil

---

## 5) ⚠️ Wrong Direction Warnings

- Telefon çok yana → “Telefonu başın üzerine getirin”
- Telefon eğik → uyarı
- Kafa çok önde / arkada → uyarı

---

## 6) 🔊 Ses & Haptic Feedback

- Doğru pozisyona yaklaşırken sesli feedback.
- Otomatik çekim öncesi bipler veya alçalıp yükselen radar sesi.
- Haptic feedback (varsa) + vibrasyon fallback.

---

## 7) 🧭 Yakınlık Skoru (Capture Readiness Score)

PDF gereksinimi: “Doğru pozisyona ne kadar yakın olduğunu gösterme”

Score =  
- Kafa pozisyonu doğruluğu  
- Pitch / Roll stabilizasyonu  
- Uzaklık doğruluğu  

UI gösterimi: Progress bar / ring.

---

## 8) 🔄 Akış Kontrolleri (Retake / Continue)

Fotoğraf çekilince:
- Preview ekranı
- “Retake”
- “Continue to BackDonor” veya bir sonraki açı

5 adıma bağlı global akışla uyumlu.

---

## 9) 🧪 Teknik Gereklilikler

- Gyroscope + accelerometer kullanımı.
- Realtime sensor + head detection algoritması.
- 30–60 FPS veri işleme.
- Pitch/roll smoothing (low pass / Kalman).
- Dik konum stabilizasyon algoritması.

---

## 10) 📂 Metadata Kaydı

Vertex için kaydedilmesi önerilen veriler:

- pitch, roll  
- kafa bounding box  
- mesafe skoru  
- capture timestamp  
- aydınlık seviyesi (opsiyon)

---

## 🔥 Ultra Kısa CheckList

| Özellik | Durum |
|--------|-------|
| Head Detection | ✔ zorunlu |
| Phone Angle | ✔ pitch≈90°, roll≈0° |
| Auto Capture | ✔ |
| Stabilization Timer | ✔ |
| Distance Control | ✔ |
| Overlay | ✔ tepe silhouette |
| Wrong Direction Warning | ✔ |
| Haptic + Sound | ✔ |
| Countdown | ✔ |
| Readiness Score | ✔ |
| Consistent Framing | ✔ |
