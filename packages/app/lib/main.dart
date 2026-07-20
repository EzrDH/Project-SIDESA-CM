import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'theme.dart';
import 'app_config.dart';
import 'crypto/android_keystore.dart';
import 'crypto/ecdsa.dart';
import 'state/session.dart';
import 'state/session_scope.dart';
import 'state/device_identity.dart';
import 'screens/login_screen.dart';
import 'screens/enroll_screen.dart';
import 'screens/main_shell.dart';
import 'screens/operator_shell.dart';
import 'screens/kades_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const store = SecureDeviceIdentityStore();
  runApp(SidesaApp(
    session: await _buildSession(),
    store: store,
    identity: await _resolveIdentity(store),
  ));
}

/// Prefer the hardware-backed, biometric-gated key when requested and available;
/// otherwise fall back to the in-memory dev key.
Future<Session> _buildSession() async {
  if (AppConfig.useHardwareKey && await AndroidKeyStore.isAvailable()) {
    const ks = AndroidKeyStore();
    final pub = await ks.ensureKey();
    debugPrint('SIDESA hardware public key: ${bytesToHex(pub)}');
    return Session(keyStore: ks);
  }
  return Session();
}

/// A dart-define account still wins, so the development runbook keeps working;
/// otherwise use whatever this device was enrolled as.
Future<DeviceIdentity?> _resolveIdentity(DeviceIdentityStore store) async {
  if (AppConfig.devAccountId.isNotEmpty) {
    return DeviceIdentity(accountId: AppConfig.devAccountId, role: 'WARGA', displayName: '');
  }
  return store.load();
}

class SidesaApp extends StatelessWidget {
  final Session session;
  final DeviceIdentityStore store;
  final DeviceIdentity? identity;
  const SidesaApp({super.key, required this.session, required this.store, this.identity});

  @override
  Widget build(BuildContext context) {
    return SessionScope(
      session: session,
      child: MaterialApp(
        title: 'SIDESA-CM',
        debugShowCheckedModeBanner: false,
        theme: sidesaTheme(),
        home: RootGate(store: store, identity: identity),
      ),
    );
  }
}

/// Walks the device through enrolment -> login -> the shell for its role.
class RootGate extends StatefulWidget {
  final DeviceIdentityStore store;
  final DeviceIdentity? identity;
  const RootGate({super.key, required this.store, this.identity});
  @override
  State<RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<RootGate> {
  DeviceIdentity? _identity;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _identity = widget.identity;
  }

  Future<void> _onEnrolled(DeviceIdentity identity) async {
    await widget.store.save(identity);
    if (mounted) setState(() => _identity = identity);
  }

  Future<void> _login() async {
    final session = SessionScope.of(context);
    final accountId = _identity?.accountId ?? '';
    if (accountId.isNotEmpty) {
      try {
        await session.login(accountId);
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Masuk mode demo (backend tidak tersedia).')),
          );
        }
      }
    }
    if (mounted) setState(() => _loggedIn = true);
  }

  void _logout() {
    SessionScope.of(context).logout();
    setState(() => _loggedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    // Not enrolled yet -> the device must be claimed with an operator's code.
    if (_identity == null) return EnrollScreen(onEnrolled: _onEnrolled);
    if (!_loggedIn) return LoginScreen(onLogin: _login);
    // Each role lands on its own home: operator queue, Kepala Desa signing, or warga shell.
    final session = SessionScope.of(context);
    if (session.isOperator) return OperatorShell(onLogout: _logout);
    if (session.isKades) return KadesShell(onLogout: _logout);
    return MainShell(onLogout: _logout);
  }
}
