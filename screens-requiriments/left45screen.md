# ✅ LEFT45 (Sola 45°) – PDF’e Göre Tüm Gereksinimler

Aşağıdaki liste, Smile Hair Clinic Hackathon PDF’ine göre **Left45** ekranında bulunması gereken tüm teknik ve UX gereksinimlerinin eksiksiz özetidir.

---

## 1) 📸 Auto-Capture (Otomatik Çekim)

Left45 ekranında otomatik çekim **zorunludur** ve şu üç koşul aynı anda sağlanmadan tetiklenmez:

### **Koşul 1 — Face Detection aktif**
- Yüz algılanmalı (ML Kit / Vision).
- Yüz ortalanmalı.
- Yüzün **ön ve sol yan cephesi** kadrajda olmalı.
- “% coverage” kriteri sağlanmalı.

### **Koşul 2 — Phone Sensor Validation**
- Telefon sola 45° bakışa uygun konumda olmalı.  
  - Yüz yaw ≈ -45° (sola dönük)
  - Pitch: ~0° (±5° tolerans)  
  - Roll: ~0° (±5° tolerans)
- Telefon açısı sabit tutulabilir.

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
- Yaw ≈ -45° (sola dönük)
- Pitch & roll normal sınırda.

### **Uyarılar**
- “Lütfen yüzünüzü 45° sola çevirin”
- “Telefonu sabit tutun”
- “Biraz yaklaşın / uzaklaşın” (mesafeye göre)

---

## 3) 📏 Uzaklık Doğrulama (Distance Validation)

- Yüz bounding box belirli MIN–MAX aralığında olmalı.
- Çok yakın → “Biraz uzaklaşın”
- Çok uzak → “Biraz yaklaşın”
- Amaç: tüm kullanıcılar için tutarlı framing.

---

## 4) 🎯 Overlay / Guide (Görsel Yönlendirme)

### **Görsel kılavuzlar**
- Oval yüz hizalama overlay'i, sola 45° dönüş silhouette.
- Ortada crosshair (merkez çizgisi).
- Doğru hizalandığında yeşile dönen UI.

### **Dinamik feedback**
- Telefon eğimli → kırmızı
- Yaklaşıyor → sarı
- Tam doğru → yeşil

---

## 5) ⚠️ Wrong Direction Warnings

- Yüz yeterince sola dönük değil → “Lütfen yüzünüzü sola çevirin”
- Yüz sağa dönük → uyarı
- Kafa aşağı/eğik → uyarı
- Telefon pitch yanlış → “Telefonu sabit tutun”

---

## 6) 🔊 Ses & Haptic Feedback

- Doğru açıya yaklaşırken sesli feedback.
- Otomatik çekim öncesi bipler veya radar tarzı alçalıp yükselen ses.
- Haptic feedback (varsa) + vibrasyon fallback.

---

## 7) 🧭 Yakınlık Skoru (Capture Readiness Score)

PDF gereksinimi: “Doğru pozisyona ne kadar yakın olduğunu gösterme”

Score =  
- Face detection aktifliği  
- Yüz ortalanma puanı  
- Yaw / Pitch / Roll doğruluğu  
- Uzaklık doğruluğu  

UI gösterimi: Progress bar / ring.

---

## 8) 🔄 Akış Kontrolleri (Retake / Continue)

Fotoğraf çekilince:
- Preview ekranı
- “Retake”
- “Continue to Vertex” veya bir sonraki açı

5 adıma bağlı global akışla uyumlu.

---

## 9) 🧪 Teknik Gereklilikler

- Gyroscope + accelerometer kullanımı.
- Realtime sensor + face analyzer.
- 30–60 FPS veri işleme.
- Pitch/roll smoothing (low pass / Kalman).
- Yaw doğruluğu + stabilizasyon algoritması.

---

## 10) 📂 Metadata Kaydı

Left45 için kaydedilmesi önerilen veriler:

- yaw, pitch, roll  
- yüz bounding box  
- mesafe skoru  
- capture timestamp  
- aydınlık seviyesi (opsiyon)

---

## 🔥 Ultra Kısa CheckList

| Özellik | Durum |
|--------|-------|
| Face Detection | ✔ zorunlu |
| Yaw | ✔ ≈ -45° sola |
| Phone Angle | ✔ pitch≈0°, roll≈0° |
| Auto Capture | ✔ |
| Stabilization Timer | ✔ |
| Distance Control | ✔ |
| Overlay | ✔ sola dönüş silhouette |
| Wrong Direction Warning | ✔ |
| Haptic + Sound | ✔ |
| Countdown | ✔ |
| Readiness Score | ✔ |
| Consistent Framing | ✔ |
