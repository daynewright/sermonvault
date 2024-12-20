import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <main className="container mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-extrabold text-primary mb-8">Terms of Service</h1>

        <div className="prose prose-lg max-w-none">
          <p>Welcome to SermonVault. By using our services, you agree to these terms. Please read them carefully.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">1. Use of Service</h2>
          <p>SermonVault provides an AI-powered platform for sermon analysis and insights. You must use this service only as permitted by law. We may suspend or stop providing our services to you if you do not comply with our terms or policies.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. Privacy and Copyright Protection</h2>
          <p>SermonVault's privacy policies explain how we treat your personal data and protect your privacy when you use our Services. By using our services, you agree that SermonVault can use such data in accordance with our privacy policies.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Your Content in our Services</h2>
          <p>SermonVault allows you to upload, submit, store, send or receive content. You retain ownership of any intellectual property rights that you hold in that content. When you upload, submit, store, send or receive content to or through our Services, you give SermonVault a worldwide license to use, host, store, reproduce, modify, create derivative works, communicate, publish, publicly perform, publicly display and distribute such content.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. AI Processing and Analysis</h2>
          <p>Our service uses AI to process and analyze your sermon content. While we strive for accuracy, you acknowledge that AI-generated insights may not always be perfect and should be used as a tool to aid, not replace, human interpretation and understanding.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Modifying and Terminating our Services</h2>
          <p>We are constantly changing and improving our Services. We may add or remove functionalities or features, and we may suspend or stop a Service altogether. You can stop using our Services at any time. SermonVault may also stop providing Services to you, or add or create new limits to our Services at any time.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">6. Liability for our Services</h2>
          <p>When permitted by law, SermonVault, and SermonVault's suppliers and distributors, will not be responsible for lost profits, revenues, or data, financial losses or indirect, special, consequential, exemplary, or punitive damages.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">7. Business uses of our Services</h2>
          <p>If you are using our Services on behalf of a business, that business accepts these terms. It will hold harmless and indemnify SermonVault and its affiliates, officers, agents, and employees from any claim, suit or action arising from or related to the use of the Services or violation of these terms, including any liability or expense arising from claims, losses, damages, suits, judgments, litigation costs and attorneys' fees.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">8. About these Terms</h2>
          <p>We may modify these terms or any additional terms that apply to a Service to, for example, reflect changes to the law or changes to our Services. You should look at the terms regularly. We'll post notice of modifications to these terms on this page. Changes will not apply retroactively and will become effective no sooner than fourteen days after they are posted.</p>
        </div>
      </main>
    </div>
  )
}

