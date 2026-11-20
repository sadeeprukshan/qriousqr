# ML Kit text recognition: we only bundle the Latin recognizer (digits + English labels).
# The plugin references the optional Chinese/Devanagari/Japanese/Korean packs, which we
# intentionally don't include, so tell R8 not to fail on their absence.
-dontwarn com.google.mlkit.vision.text.chinese.**
-dontwarn com.google.mlkit.vision.text.devanagari.**
-dontwarn com.google.mlkit.vision.text.japanese.**
-dontwarn com.google.mlkit.vision.text.korean.**

# ML Kit creates its components by reflection; R8 must not strip or rename them
# (otherwise: "Could not instantiate com.google.mlkit.common.internal.CommonComponentRegistrar").
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_common.** { *; }
-keep class com.google.firebase.components.** { *; }
-keep class * implements com.google.firebase.components.ComponentRegistrar { <init>(); }
