# ONNX Runtime resuelve varias de sus propias clases (TensorInfo, OnnxValue, OrtSession,
# etc.) por nombre desde su codigo nativo (JNI) al ejecutar session.run(). Si R8 las
# renombra o elimina por no detectar esa referencia, el runtime nativo lanza
# ClassNotFoundException cruzando el limite JNI -> SIGABRT -> cierre de la app en release
# (visto en logcat: "JNI DETECTED ERROR IN APPLICATION: java_class == null" sobre
# ai.onnxruntime.TensorInfo, justo durante la validacion con IA on-device del modulo de
# piezas). Mantener esta clase completa sin minimizar/ofuscar resuelve el crash.
-keep class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**
