import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Clock, Send, Shield, Zap, Trash2 } from "lucide-react";
import heroImage from "@assets/generated_images/Hero_inbox_illustration_purple_4415092b.png";
import { withBasePath } from "@/lib/basePath";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-screen max-h-[800px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: Content */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Temporary Email Addresses in Seconds
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                Create disposable email addresses instantly. Protect your privacy, avoid spam, and keep your inbox clean with auto-expiring aliases.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href={withBasePath("/dashboard")}>
                  <Button size="lg" className="text-base px-8" data-testid="button-get-started">
                    Get Started Free
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-base px-8" data-testid="button-learn-more">
                  Learn More
                </Button>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="flex-1 w-full max-w-xl">
              <img 
                src={heroImage} 
                alt="Email inbox illustration" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Redweyne?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, secure, and powerful temporary email service for developers and privacy-conscious users.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-card-border">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">Instant Setup</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Create temporary email addresses in seconds. No registration, no hassle. Just click and go.
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">Auto-Expiry</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Set custom TTL for each alias. Emails automatically delete after expiration for maximum privacy.
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Send className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">SendGrid Integration</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Powered by SendGrid SMTP. Reliable email delivery with up to 100 emails per day on the free tier.
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">Privacy First</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your data is sanitized and secured. Emails are stored temporarily and automatically cleaned up.
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">Full Email Support</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Receive and view HTML emails, plaintext messages, and attachments with full compatibility.
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Trash2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">No Clutter</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Keep your real inbox clean. Use temp addresses for signups, testing, and one-time communications.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">Three simple steps to email privacy</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-6 mx-auto">
                1
              </div>
              <h3 className="text-lg font-semibold mb-3">Create an Alias</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Click "New Alias" and choose a custom prefix or auto-generate one. Set your preferred expiry time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-6 mx-auto">
                2
              </div>
              <h3 className="text-lg font-semibold mb-3">Receive Emails</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use your temporary address anywhere. Emails arrive instantly and are stored securely.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-6 mx-auto">
                3
              </div>
              <h3 className="text-lg font-semibold mb-3">Auto-Delete</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                After the TTL expires, your alias and all emails are automatically cleaned up. Zero trace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create your first temporary email address now. No signup required.
          </p>
          <Link href={withBasePath("/dashboard")}>
            <Button size="lg" className="text-base px-12" data-testid="button-cta-dashboard">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Redweyne.com - Temporary Email Service
          </p>
        </div>
      </footer>
    </div>
  );
}
