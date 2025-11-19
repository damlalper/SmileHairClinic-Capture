# ✅ FRONTFACE (Tam Yüz Karşıdan) – PDF’e Göre Tüm Gereksinimler

Aşağıdaki liste, Smile Hair Clinic Hackathon PDF’ine göre **Frontface** ekranında bulunması gereken tüm teknik ve UX gereksinimlerinin eksiksiz özetidir.

---

## 1) 📸 Auto-Capture (Otomatik Çekim)

Frontface ekranında otomatik çekim **zorunludur** ve şu üç koşul aynı anda sağlanmadan tetiklenmez:

### **Koşul 1 — Face Detection aktif**
- Yüz algılanmalı (ML Kit / Vision).
- Yüz ortalanmalı.
- “Frontal yüz % coverage” sağlanmalı.

### **Koşul 2 — Phone Sensor Validation**
- Telefon **0 dereceye yakın eğimde** olmalı.  
  - pitch: ~0° (±5° tolerans)  
  - roll: ~0° (±5° tolerans)

### **Koşul 3 — Stabilization Timer**
- Şartlar **700–1200 ms** stabil şekilde korunmalı.

### **Koşullar sağlanınca:**
- 3…2…1 geri sayım veya bip sesi.
- Otomatik çekim.
- Haptic feedback + fallback vibrasyon.

---

## 2) 🧍‍♂️ Yüz Pozisyonu Doğrulama (Face Position Guidance)

### **Yüz konumu**
- Yüz kamera görüntüsünün ortasında olmalı.
- Çok kaçarsa: “Move left / right / up / down”.

### **Yüz açısı**
- Yaw ≈ 0° (tam karşı bakma).
- Pitch & roll normal sınırda.

### **Uyarılar**
- “Lütfen yüzünüzü ortalayın”
- “Telefonu düz tutun”
- “Biraz yaklaşın / uzaklaşın”

---

## 3) 📏 Uzaklık Doğrulama (Distance Validation)

- Yüz bounding box belirli MIN–MAX aralığında olmalı.
- Çok yakın → “Biraz uzaklaşın”
- Çok uzak → “Biraz yaklaşın”
- Amaç: tüm kullanıcılar için tutarlı framing.

---

## 4) 🎯 Overlay / Guide (Görsel Yönlendirme)

### **Görsel kılavuzlar**
- Oval yüz hizalama overlay'i.
- Ortada crosshair (merkez çizgisi).
- Doğru hizalandığında yeşile dönen UI.

### **Dinamik feedback**
- Telefon eğimli → kırmızı
- Yaklaşıyor → sarı
- Tam doğru → yeşil

---

## 5) ⚠️ Wrong Direction Warnings

- Yüz sağa dönük → “Kameraya tam karşı bakın”
- Yüz sola dönük
- Kafa aşağı/eğik
- Telefon pitch yanlış → “Telefonu yere paralel tutun”

---

## 6) 🔊 Ses & Haptic Feedback

- Doğru açıya yaklaşırken sesli feedback.
- Otomatik çekim öncesi bipler veya yönlendirme sesi.
- Haptic feedback (varsa) + vibrasyon fallback.

---

## 7) 🧭 Yakınlık Skoru (Capture Readiness Score)

PDF gereksinimi: “Doğru pozisyona ne kadar yakın olduğunu gösterme”

Score =  
- Face detection aktifliği  
- Yüz ortalanma puanı  
- Pitch/Roll doğruluğu  
- Uzaklık doğruluğu  

UI gösterimi: Progress bar / ring.

---

## 8) 🔄 Akış Kontrolleri (Retake / Continue)

Fotoğraf çekilince:
- Preview ekranı
- “Retake”
- “Continue to Right45”

5 adıma bağlı global akışla uyumlu.

---

## 9) 🧪 Teknik Gereklilikler

- Gyroscope + accelerometer kullanımı.
- Realtime sensor + face analyzer.
- 30–60 FPS veri işleme.
- Pitch/roll smoothing (low pass / Kalman).

---

## 10) 📂 Metadata Kaydı

Frontface için kaydedilmesi önerilen veriler:

- pitch, roll  
- yüz bounding box  
- mesafe skoru  
- capture timestamp  
- aydınlık seviyesi (opsiyon)

---

## 🔥 Ultra Kısa CheckList

| Özellik | Durum |
|--------|-------|
| Face Detection | ✔ zorunlu |
| Phone Angle | ✔ pitch≈0°, roll≈0° |
| Auto Capture | ✔ |
| Stabilization Timer | ✔ |
| Distance Control | ✔ |
| Overlay | ✔ yüz hizalama |
| Wrong Direction Warning | ✔ |
| Haptic + Sound | ✔ |
| Countdown | ✔ |
| Readiness Score | ✔ |
| Consistent Framing | ✔ |

---
