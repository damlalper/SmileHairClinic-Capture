# 🚀 Smile Hair Clinic - Quick Start Guide

## Hızlı Kurulum

### 1. Bağımlılıkları Yükle

```bash
cd smile-hair-capture
npm install
```

veya

```bash
yarn install
```

### 2. Uygulamayı Çalıştır

#### iOS (Mac gereklidir):
```bash
npm run ios
```

#### Android:
```bash
npm run android
```

#### Expo Go ile Test:
```bash
npm start
```
Sonra QR kodu telefonunuzla okut.

## 📱 Fiziksel Cihazda Test

**ÖNEMLİ:** Bu uygulama şu özellikleri kullandığı için **fiziksel cihazda** test edilmelidir:
- Kamera (front-facing)
- Gyroscope
- Accelerometer
- Face detection
- Haptic feedback

### iOS (Fiziksel Cihaz):
1. Apple Developer hesabınızla giriş yapın
2. Cihazınızı Mac'e bağlayın
3. `npm run ios` komutu otomatik olarak cihazı algılar

### Android (Fiziksel Cihaz):
1. Geliştirici seçeneklerini etkinleştirin
2. USB debugging'i açın
3. Cihazı bilgisayara bağlayın
4. `adb devices` ile cihazı kontrol edin
5. `npm run android`

## 🎯 İlk Kullanım

1. **İzinler**: Uygulama başladığında kamera ve sensör izinlerini verin
2. **Welcome Screen**: "Fotoğraf Çekimine Başla" butonuna basın
3. **Talimatlar**: Her açı için talimatları okuyun
4. **Çekim**: Telefonu doğru pozisyonda tutun, uygulama otomatik çekecek
5. **İnceleme**: Fotoğrafı kontrol edin, beğendiyseniz "Devam Et"
6. **5 Kez Tekrarla**: Tüm açılar için
7. **Tamamlama**: Tüm fotoğrafları görün ve kaydedin

## 🔧 Sorun Giderme

### Kamera Çalışmıyor
```bash
# iOS için izinleri sıfırla
xcrun simctl privacy booted reset camera

# Android için
adb shell pm reset-permissions
```

### Sensörler Çalışmıyor
- **Emülatörde normal**: Sensörler fiziksel cihazda çalışır
- Fiziksel cihazda test edin

### Build Hataları
```bash
# Cache'i temizle
npm start --clear

# node_modules'u sil ve yeniden yükle
rm -rf node_modules
npm install

# iOS için
cd ios
pod install
cd ..
```

### Metro Bundler Hataları
```bash
# Metro cache'i temizle
npm start --reset-cache
```

## 📦 Gerekli İzinler

### iOS (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>Saç analizi için fotoğraf çekmek için kamera erişimi gereklidir</string>

<key>NSMotionUsageDescription</key>
<string>Telefon açısını ölçmek için hareket sensörlerine erişim gereklidir</string>

<key>NSFaceDetectionUsageDescription</key>
<string>Doğru pozisyonu tespit etmek için yüz algılama gereklidir</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<uses-feature android:name="android.hardware.camera" />
<uses-feature android:name="android.hardware.sensor.gyroscope" />
<uses-feature android:name="android.hardware.sensor.accelerometer" />
```

## 🎨 Özelleştirme

### Renk Paleti Değiştirme
`src/constants/angles.ts`:
```typescript
export const COLORS = {
  primary: '#2E5090', // Değiştir
  secondary: '#00A3E0',
  success: '#4CAF50',
  // ...
};
```

### Açı Toleransı Ayarlama
`src/constants/angles.ts`:
```typescript
phoneAngle: {
  pitch: 90,
  roll: 0,
  yaw: 0,
  tolerance: 15, // Bu değeri değiştir
}
```

### Mesafe Aralığı Ayarlama
```typescript
distanceRange: {
  min: 35, // Minimum mesafe (cm)
  max: 45, // Maksimum mesafe (cm)
}
```

## 📊 Performans İpuçları

1. **Release Mode**: Production build'lerde daha hızlı
   ```bash
   # iOS
   npm run ios --configuration Release

   # Android
   npm run android --variant release
   ```

2. **Image Quality**: `CameraScreen.tsx`'de quality parametresini ayarlayın:
   ```typescript
   takePictureAsync({
     quality: 0.8, // 0.0 - 1.0
   })
   ```

3. **Frame Rate**: Sensor update interval'i ayarlayın (varsayılan 100ms)

## 🧪 Test Modu

Debug bilgilerini görmek için:
- Camera ekranında debug container'ı zaten aktif
- Pitch, Roll, Yaw değerleri görünür
- Manuel çekim butonu mevcut

## 📱 Desteklenen Platformlar

- ✅ iOS 13+
- ✅ Android 8.0+ (API level 26+)
- ❌ Web (Kamera ve sensörler gerekli)

## 🎯 Production Build

### iOS App Store
```bash
# Build yap
eas build --platform ios

# Submit et
eas submit --platform ios
```

### Google Play Store
```bash
# Build yap
eas build --platform android

# Submit et
eas submit --platform android
```

## 🆘 Yardım

### Dokümantasyon
- `IMPLEMENTATION_SUMMARY.md` - Detaylı özellik listesi
- `ARCHITECTURE_DIAGRAM.md` - Teknik mimari
- `docs/` - Ek dokümantasyon

### İletişim
- GitHub Issues: Hata bildirimi için
- Email: support@smilehairclinic.com

## ✨ Önemli Notlar

1. **Aydınlatma**: En iyi sonuç için iyi aydınlatılmış ortamda test edin
2. **Saç**: Saç çizgisi açıkça görünmeli (özellikle tepe ve arka için)
3. **Stabilite**: Telefonu titremeden tutun
4. **Sabır**: Otomatik çekimin olmasını bekleyin
5. **Tekrar**: İyi sonuç alamazsanız "Tekrar Çek" kullanın

**Başarılı testler! 🎉**
