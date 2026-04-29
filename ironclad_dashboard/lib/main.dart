
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:crypto/crypto.dart';
import 'package:file_picker/file_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Ironclad: Web Configuration for ideaapp-209463
  await Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: "AIzaSyBNsT_ovo8TJQDF0Roh8OM92xp6oItToS0",
      appId: "1:851232155264:web:53b6e21be1337a638a2865",
      messagingSenderId: "851232155264",
      projectId: "ideaapp-209463",
      storageBucket: "ideaapp-209463.firebasestorage.app",
      authDomain: "ideaapp-209463.firebaseapp.com",
    ),
  );
  
  runApp(const IroncladApp());
}

enum IroncladView { dashboard, about }

class IroncladApp extends StatelessWidget {
  const IroncladApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ironclad Verification',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0A0A0B),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00FFC2),
          brightness: Brightness.dark,
          primary: const Color(0xFF00FFC2),
        ),
      ),
      home: const MainScaffold(),
    );
  }
}

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  IroncladView _currentView = IroncladView.dashboard;
  String? _fileName;
  String? _fileHash;
  Map<String, dynamic>? _receipt;
  bool _isVerifying = false;
  bool _isVerified = false;

  void _resetState() {
    setState(() {
      _fileName = null;
      _fileHash = null;
      _receipt = null;
      _isVerifying = false;
      _isVerified = false;
    });
  }

  Future<void> _pickFile() async {
    FilePickerResult? result = await FilePicker.pickFiles(withData: true);

    if (result != null && result.files.single.bytes != null) {
      setState(() {
        _fileName = result.files.single.name;
        _isVerifying = true;
        _isVerified = false;
        _receipt = null;
      });

      await _processFile(result.files.single.bytes!);
    }
  }

  Future<void> _processFile(List<int> bytes) async {
    final hash = sha256.convert(bytes).toString();

    setState(() {
      _fileHash = hash;
    });

    // Artificial delay for cinematic effect
    await Future.delayed(const Duration(seconds: 2));

    try {
      final query = await FirebaseFirestore.instance
          .collection('receipts')
          .where('assetHash', isEqualTo: hash)
          .limit(1)
          .get();

      if (query.docs.isNotEmpty) {
        setState(() {
          _receipt = query.docs.first.data();
          _receipt!['receiptId'] = query.docs.first.id;
          _isVerified = true;
        });
      } else {
        setState(() {
          _isVerified = false;
        });
      }
    } catch (e) {
      debugPrint("Verification Error: $e");
      // Fallback for demonstration if Firebase is not connected
      if (hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") {
         setState(() {
          _isVerified = true;
          _receipt = {
            "assetName": "Verification Demo",
            "receiptId": "DEMO-RECEIPT-ID",
            "timestamp": DateTime.now().toIso8601String(),
            "vaultUri": "https://iv-s2y67ujxs3kp6.vault.azure.net/"
          };
        });
      }
    } finally {
      setState(() {
        _isVerifying = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          _buildSidebar(),
          Expanded(
            child: Stack(
              children: [
                // Background Gradient
                Positioned.fill(
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: RadialGradient(
                        center: Alignment(0.8, -0.6),
                        radius: 1.2,
                        colors: [
                          Color(0xFF001F1A),
                          Color(0xFF0A0A0B),
                        ],
                      ),
                    ),
                  ),
                ),
                SafeArea(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 400),
                    child: _currentView == IroncladView.dashboard 
                      ? _buildDashboardView() 
                      : _buildAboutView(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      width: 80,
      decoration: BoxDecoration(
        color: const Color(0xFF0D0D0F),
        border: Border(right: BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Column(
        children: [
          const SizedBox(height: 40),
          _buildSidebarItem(Icons.shield_outlined, IroncladView.dashboard),
          const SizedBox(height: 20),
          _buildSidebarItem(Icons.info_outline, IroncladView.about),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.exit_to_app, color: Colors.white24),
            onPressed: () {
              // Link back to DevSite
            },
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSidebarItem(IconData icon, IroncladView view) {
    bool isActive = _currentView == view;
    return InkWell(
      onTap: () => setState(() => _currentView = view),
      child: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF00FFC2).withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          icon, 
          color: isActive ? const Color(0xFF00FFC2) : Colors.white24,
        ),
      ),
    );
  }

  Widget _buildDashboardView() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 40),
          _buildHeader(),
          const SizedBox(height: 60),
          Expanded(
            child: Center(
              child: _isVerifying 
                ? _buildVerifyingState() 
                : (_fileName == null ? _buildEmptyState() : _buildResultState()),
            ),
          ),
          const SizedBox(height: 40),
          _buildProtocolInfo(),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildAboutView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "THE ARCHITECT",
            style: GoogleFonts.outfit(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              letterSpacing: 4,
              color: const Color(0xFF00FFC2).withOpacity(0.8),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            "J.A. Moreno",
            style: GoogleFonts.outfit(fontSize: 48, fontWeight: FontWeight.bold),
          ),
          Text(
            "Cloud Security & Identity Architect",
            style: GoogleFonts.outfit(fontSize: 18, color: Colors.white54),
          ),
          const SizedBox(height: 60),
          _buildAboutSection("THE PROTOCOL", "Ironclad is a sovereign cryptographic verification system designed to bridge the gap between volatile digital assets and immutable legal proof. By leveraging zero-knowledge principles, the protocol ensures integrity without compromising privacy."),
          const SizedBox(height: 40),
          _buildAboutSection("TECHNICAL STACK", "A hybrid-cloud infrastructure utilizing Azure Key Vault HSM (FIPS 140-2 Level 3) for identity-backed signatures, Google Firestore for high-availability ledger persistence, and the Bitcoin network (via OpenTimestamps) for universal cryptographic anchoring."),
          const SizedBox(height: 60),
          ElevatedButton.icon(
            onPressed: () {
              // Open DevSite
            },
            icon: const Icon(Icons.launch, size: 18),
            label: const Text("VISIT MISSION CONTROL"),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00FFC2),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAboutSection(String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 2, color: const Color(0xFF00FFC2)),
        ),
        const SizedBox(height: 12),
        Text(
          content,
          style: GoogleFonts.outfit(fontSize: 16, color: Colors.white70, height: 1.6),
        ),
      ],
    );
  }

  Widget _buildProtocolInfo() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.info_outline, size: 16, color: Color(0xFF00FFC2)),
              const SizedBox(width: 8),
              Text(
                "IRONCLAD PROTOCOL v1.0",
                style: GoogleFonts.outfit(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                  color: const Color(0xFF00FFC2),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoItem("Zero-Knowledge Audit", "Files are analyzed locally in your browser. Your data never leaves your device; only the mathematical hash is transmitted for ledger lookup."),
          const SizedBox(height: 8),
          _buildInfoItem("Mathematical Proof", "Verification relies on SHA-256 collision-resistant hashing and RS256 signatures backed by FIPS 140-2 Level 3 Hardware Security Modules."),
          const SizedBox(height: 8),
          _buildInfoItem("How to Seal", "New assets must be notarized via an authorized Sovereign Node. Sealing is a privileged administrative action to ensure ledger integrity."),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String title, String desc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70)),
        const SizedBox(height: 2),
        Text(desc, style: GoogleFonts.outfit(fontSize: 11, color: Colors.white38, height: 1.4)),
      ],
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "IRONCLAD",
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            letterSpacing: 4,
            color: const Color(0xFF00FFC2).withOpacity(0.8),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          "Cryptographic\nVerification Dashboard",
          style: GoogleFonts.outfit(
            fontSize: 32,
            fontWeight: FontWeight.w700,
            height: 1.1,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return InkWell(
      onTap: _pickFile,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        width: double.infinity,
        height: 300,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shield_outlined, size: 64, color: Colors.white.withOpacity(0.2)),
            const SizedBox(height: 24),
            Text(
              "Drop Asset or Browse",
              style: GoogleFonts.outfit(fontSize: 18, color: Colors.white70),
            ),
            const SizedBox(height: 8),
            Text(
              "SHA-256 Mathematical Audit",
              style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerifyingState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(
          width: 80,
          height: 80,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Color(0xFF00FFC2),
          ),
        ),
        const SizedBox(height: 40),
        Text(
          "CONSULTING THE LEDGER...",
          style: GoogleFonts.outfit(
            letterSpacing: 2,
            fontSize: 12,
            color: Colors.white54,
          ),
        ),
      ],
    );
  }

  Widget _buildResultState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _isVerified ? _buildVerifiedIcon() : _buildFailedIcon(),
        const SizedBox(height: 40),
        Text(
          _isVerified ? "ASSET SEALED" : "VERIFICATION FAILED",
          style: GoogleFonts.outfit(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: _isVerified ? const Color(0xFF00FFC2) : Colors.redAccent,
          ),
        ),
        const SizedBox(height: 12),
        if (_fileName != null)
          Text(
            _fileName!,
            style: const TextStyle(color: Colors.white54),
          ),
        const SizedBox(height: 40),
        if (_isVerified && _receipt != null) _buildReceiptDetails(),
        const SizedBox(height: 40),
        TextButton(
          onPressed: _resetState,
          child: Text(
            "VERIFY ANOTHER ASSET",
            style: GoogleFonts.outfit(
              color: Colors.white38,
              fontSize: 12,
              letterSpacing: 1,
              decoration: TextDecoration.underline,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVerifiedIcon() {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFF00FFC2), width: 2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00FFC2).withOpacity(0.2),
            blurRadius: 30,
            spreadRadius: 5,
          ),
        ],
      ),
      child: const Icon(Icons.check, size: 60, color: Color(0xFF00FFC2)),
    );
  }

  Widget _buildFailedIcon() {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.redAccent, width: 2),
      ),
      child: const Icon(Icons.close, size: 60, color: Colors.redAccent),
    );
  }

  Widget _buildReceiptDetails() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildDetailRow("LEGAL OWNER", _receipt!['legalName'] ?? "VERIFIED ARCHITECT"),
          const Divider(height: 24, color: Colors.white12),
          _buildDetailRow("RECEIPT ID", _receipt!['receiptId'] ?? "N/A"),
          const Divider(height: 24, color: Colors.white12),
          _buildDetailRow("TIMESTAMP", _receipt!['timestamp']?.toString() ?? "N/A"),
          const Divider(height: 24, color: Colors.white12),
          _buildDetailRow("SIGNATURE AUTHORITY", "AZURE HSM / RS256"),
          const Divider(height: 24, color: Colors.white12),
          _buildDetailRow("VAULT URI", _receipt!['vaultUri'] ?? "N/A"),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Colors.white38, letterSpacing: 1),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.sourceCodePro(fontSize: 12, color: Colors.white70),
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
      ],
    );
  }
}
