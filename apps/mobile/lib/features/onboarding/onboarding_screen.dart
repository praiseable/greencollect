import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _currentPage = 0;

  final _pages = const [
    _OnboardingPage(
      icon: Icons.sell,
      color: Color(0xFF16A34A),
      titleEn: 'List Your Scrap',
      titleUr: 'اپنا کباڑ فروخت کریں',
      descEn: 'Post your recyclable materials with photos, price, and location. Reach buyers in your zone instantly.',
      descUr: 'تصاویر، قیمت اور مقام کے ساتھ اپنا کباڑ پوسٹ کریں۔ فوری طور پر اپنے علاقے کے خریداروں تک پہنچیں۔',
    ),
    _OnboardingPage(
      icon: Icons.handshake,
      color: Color(0xFF2563EB),
      titleEn: 'Connect with Dealers',
      titleUr: 'ڈیلرز سے جڑیں',
      descEn: 'Local dealers and franchises bid on your listings. Negotiate in-app and finalize deals securely.',
      descUr: 'مقامی ڈیلرز اور فرنچائزز آپ کی فہرستوں پر بولی لگاتے ہیں۔ ایپ میں مذاکرات کریں اور محفوظ طریقے سے ڈیل مکمل کریں۔',
    ),
    _OnboardingPage(
      icon: Icons.monetization_on,
      color: Color(0xFFF59E0B),
      titleEn: 'Get the Best Price',
      titleUr: 'بہترین قیمت پائیں',
      descEn: 'Compare offers from multiple buyers. Get paid via JazzCash, Easypaisa, or bank transfer.',
      descUr: 'متعدد خریداروں کی پیشکشوں کا موازنہ کریں۔ جاز کیش، ایزی پیسہ یا بینک ٹرانسفر سے ادائیگی حاصل کریں۔',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => context.go('/auth/login'),
                child: const Text('Skip →'),
              ),
            ),

            // Pages
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _pages.length,
                onPageChanged: (i) => setState(() => _currentPage = i),
                itemBuilder: (_, i) => _pages[i],
              ),
            ),

            // Indicator
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: SmoothPageIndicator(
                controller: _controller,
                count: _pages.length,
                effect: WormEffect(
                  dotHeight: 10,
                  dotWidth: 10,
                  activeDotColor: const Color(0xFF16A34A),
                  dotColor: Colors.grey.shade300,
                ),
              ),
            ),

            // Button
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () {
                    if (_currentPage == _pages.length - 1) {
                      context.go('/auth/login');
                    } else {
                      _controller.nextPage(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    }
                  },
                  child: Text(
                    _currentPage == _pages.length - 1 ? 'Get Started' : 'Next',
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String titleEn;
  final String titleUr;
  final String descEn;
  final String descUr;

  const _OnboardingPage({
    required this.icon,
    required this.color,
    required this.titleEn,
    required this.titleUr,
    required this.descEn,
    required this.descUr,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 80, color: color),
          ),
          const SizedBox(height: 40),
          Text(
            titleEn,
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            titleUr,
            style: TextStyle(fontSize: 22, color: Colors.grey[600]),
            textAlign: TextAlign.center,
            textDirection: TextDirection.rtl,
          ),
          const SizedBox(height: 20),
          Text(
            descEn,
            style: TextStyle(fontSize: 15, color: Colors.grey[600], height: 1.5),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            descUr,
            style: TextStyle(fontSize: 14, color: Colors.grey[500], height: 1.6),
            textAlign: TextAlign.center,
            textDirection: TextDirection.rtl,
          ),
        ],
      ),
    );
  }
}
