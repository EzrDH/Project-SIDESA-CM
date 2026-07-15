import 'package:flutter/widgets.dart';
import 'session.dart';

/// Makes the app-wide [Session] available to any screen via `SessionScope.of(context)`.
class SessionScope extends InheritedWidget {
  final Session session;
  const SessionScope({super.key, required this.session, required super.child});

  static Session of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<SessionScope>();
    assert(scope != null, 'SessionScope not found in the widget tree');
    return scope!.session;
  }

  @override
  bool updateShouldNotify(SessionScope oldWidget) => oldWidget.session != session;
}
