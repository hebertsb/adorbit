import 'package:flutter/material.dart';

/// Simbolo real de AdOrbit (A geometrica + orbita), mismos paths que
/// documentacion/diseno/adorbit-simbolo.svg y el logo-adorbit de portal-gestion —
/// no es un marcador de posicion.
class LogoAdorbit extends StatelessWidget {
  const LogoAdorbit({super.key, this.tamano = 28, this.color});

  final double tamano;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colorFinal = color ?? Theme.of(context).colorScheme.primary;
    return CustomPaint(
      size: Size(tamano, tamano),
      painter: _LogoAdorbitPainter(colorFinal),
    );
  }
}

class _LogoAdorbitPainter extends CustomPainter {
  _LogoAdorbitPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 128, size.height / 128);
    final pintura = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final letraA = Path()
      ..moveTo(25, 104)
      ..lineTo(57, 25)
      ..quadraticBezierTo(59, 20, 65, 20)
      ..lineTo(69, 20)
      ..quadraticBezierTo(74, 20, 76, 25)
      ..lineTo(108, 104)
      ..lineTo(86, 104)
      ..lineTo(65, 48)
      ..lineTo(45, 104)
      ..close();
    canvas.drawPath(letraA, pintura);

    final orbita = Path()
      ..moveTo(103, 37)
      ..cubicTo(80, 31, 38, 48, 19, 69)
      ..cubicTo(-2, 92, 21, 102, 58, 91)
      ..cubicTo(80, 85, 100, 74, 111, 62)
      ..lineTo(105, 57)
      ..cubicTo(91, 70, 72, 79, 54, 84)
      ..cubicTo(26, 92, 16, 87, 28, 75)
      ..cubicTo(44, 58, 80, 43, 100, 44)
      ..close();
    canvas.drawPath(orbita, pintura);

    canvas.drawCircle(const Offset(110, 39), 8, pintura);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _LogoAdorbitPainter oldDelegate) =>
      oldDelegate.color != color;
}
