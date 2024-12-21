'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ArrowRight,
  Upload,
  Search,
  Lightbulb,
  BookOpen,
  Zap,
  Share2,
  Clock,
  BarChart,
  Menu,
} from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Cache the nav links on mount to avoid repeated querySelector calls
    const navLinks = Array.from(document.querySelectorAll('nav a[href^="#"]'));
    const navLinkMap = new Map(
      navLinks.map((link) => [link.getAttribute('href')?.substring(1), link])
    );

    const handleScroll = () => {
      const scrollPosition = window.scrollY;

      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        document.querySelectorAll('section[id]').forEach((section) => {
          const sectionId = section.getAttribute('id');
          if (!sectionId) return;

          const sectionTop = (section as HTMLElement).offsetTop - 100;
          const sectionHeight = (section as HTMLElement).offsetHeight;
          const navLink = navLinkMap.get(sectionId);

          if (!navLink) return;

          // Check if section is in viewport
          const isActive =
            scrollPosition >= sectionTop &&
            scrollPosition < sectionTop + sectionHeight;

          // Use classList.toggle instead of add/remove
          navLink.classList.toggle('text-primary', isActive);
          navLink.classList.toggle('text-muted-foreground', !isActive);
        });
      });
    };

    // Add debouncing to prevent too many scroll events
    let timeoutId: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 10);
    };

    window.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const header = document.querySelector('header');

    const handleHeaderScroll = () => {
      if (window.scrollY > 0) {
        header?.classList.add('shadow-md', 'bg-background/98');
        header?.classList.remove('shadow-sm', 'bg-background/95');
      } else {
        header?.classList.add('shadow-sm', 'bg-background/95');
        header?.classList.remove('shadow-md', 'bg-background/98');
      }
    };

    window.addEventListener('scroll', handleHeaderScroll);
    return () => window.removeEventListener('scroll', handleHeaderScroll);
  }, []);

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();
    const href = e.currentTarget.href;
    const targetId = href.replace(/.*\#/, '');
    const elem = document.getElementById(targetId);
    elem?.scrollIntoView({
      behavior: 'smooth',
    });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md z-50 border-b shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-primary">SermonVault</h1>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu />
          </Button>
          <nav
            className={`${
              isMenuOpen ? 'flex' : 'hidden'
            } md:flex flex-col md:flex-row absolute md:relative top-full left-0 right-0 bg-background md:bg-transparent p-4 md:p-0 gap-4 md:gap-8`}
          >
            {['features', 'how-it-works', 'login'].map((section) => (
              <Link
                key={section}
                href={section === 'login' ? '/login' : `#${section}`}
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                onClick={
                  section === 'login'
                    ? () => router.push('/login')
                    : scrollToSection
                }
              >
                {section
                  .split('-')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-24">
        <section id="hero" className="text-center mb-32 pt-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 max-w-3xl mx-auto leading-tight">
            Unlock the Power of Your Sermons with AI
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Upload your sermons, turn them into searchable insights, and let AI
            help you find key messages effortlessly.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6 rounded-full group"
            onClick={() => router.push('/login')}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
          </Button>
        </section>

        <section id="features" className="mb-32">
          <h2 className="text-3xl font-bold text-center mb-16">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <Upload className="h-12 w-12 mb-6 text-primary" />,
                title: 'Easy Upload',
                description:
                  'Quickly upload your sermon files with our intuitive interface.',
              },
              {
                icon: <Search className="h-12 w-12 mb-6 text-primary" />,
                title: 'AI-Powered Search',
                description:
                  'Find relevant insights across all your sermons with advanced AI search technology.',
              },
              {
                icon: <Lightbulb className="h-12 w-12 mb-6 text-primary" />,
                title: 'Deep Insights',
                description:
                  'Gain new perspectives and connections within your sermon content using cutting-edge AI analysis.',
              },
              {
                icon: <BookOpen className="h-12 w-12 mb-6 text-primary" />,
                title: 'Sermon Library',
                description:
                  'Organize and access your entire sermon collection in one centralized digital library.',
              },
              {
                icon: <Zap className="h-12 w-12 mb-6 text-primary" />,
                title: 'Quick Analysis',
                description:
                  'Get instant analysis and key points from your sermons with our AI-powered tools.',
              },
              {
                icon: <Share2 className="h-12 w-12 mb-6 text-primary" />,
                title: 'Easy Sharing',
                description:
                  'Share sermon insights and excerpts with your team or congregation effortlessly.',
              },
              {
                icon: <Clock className="h-12 w-12 mb-6 text-primary" />,
                title: 'Time-Saving',
                description:
                  'Save hours of research and preparation time with our efficient AI-driven platform.',
              },
              {
                icon: <BarChart className="h-12 w-12 mb-6 text-primary" />,
                title: 'Trend Analysis',
                description:
                  'Identify recurring themes and track spiritual growth across your sermon series.',
              },
              {
                icon: <ArrowRight className="h-12 w-12 mb-6 text-primary" />,
                title: 'Continuous Learning',
                description:
                  'Our AI model continuously improves, providing increasingly accurate and relevant insights over time.',
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="text-center border-none shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader>
                  <div className="flex justify-center">{feature.icon}</div>
                  <CardTitle className="text-2xl mb-4">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mb-32">
          <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                number: '1',
                title: 'Upload Sermons',
                description: 'Upload your sermon files to SermonVault.',
              },
              {
                number: '2',
                title: 'AI Processing',
                description:
                  'Our AI reads and understands your sermon, making it easy to find later.',
              },
              {
                number: '3',
                title: 'Ask Questions',
                description:
                  'Ask questions about your sermons and get answers in seconds.',
              },
              {
                number: '4',
                title: 'Gain Insights',
                description:
                  'Receive AI-powered insights and connections from your content.',
              },
            ].map((step, index) => (
              <Card
                key={index}
                className="text-center border-none shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                    {step.number}
                  </div>
                  <CardTitle className="text-xl mb-4">{step.title}</CardTitle>
                  <CardDescription className="text-base">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section
          id="cta"
          className="text-center mb-32 bg-primary text-primary-foreground rounded-3xl p-12"
        >
          <h2 className="text-3xl font-bold mb-8">
            Ready to unlock sermon insights?
          </h2>
          <p className="text-xl mb-12 max-w-2xl mx-auto">
            Join SermonVault today and experience the power of AI-driven sermon
            analysis.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-6 rounded-full"
          >
            Start Your Free Trial
          </Button>
        </section>

        <footer className="border-t pt-12 text-center">
          <nav className="flex flex-wrap justify-center space-x-8 mb-8">
            {['features', 'how-it-works'].map((section) => (
              <Link
                key={section}
                href={`#${section}`}
                className="text-muted-foreground hover:text-primary transition-colors duration-200"
                onClick={scrollToSection}
              >
                {section
                  .split('-')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </Link>
            ))}
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              Terms of Service
            </Link>
          </nav>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SermonVault. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
}
