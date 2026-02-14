import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaFire, FaShieldAlt } from 'react-icons/fa';

function CommunityGuidelinesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center space-x-4">
          <button onClick={() => navigate('/')} className="text-blue-500 hover:text-blue-600 transition">
            <FaArrowLeft className="text-2xl" />
          </button>
          <div className="flex items-center space-x-2">
            <FaHeart className="text-2xl text-pink-500" />
            <span className="text-xl font-bold text-gray-800">EduLove</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Community Guidelines</h1>
          <p className="text-gray-600 mb-8">Keep EduLove safe and respectful for everyone</p>

          <div className="space-y-12 text-gray-700">
            {/* Core Values */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaShieldAlt className="text-blue-500" /> Core Values
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-lg mb-2">🤝 Respect</h3>
                  <p>Treat others as you'd like to be treated. Everyone deserves kindness and dignity.</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-bold text-lg mb-2">🛡️ Safety</h3>
                  <p>Report suspicious or harmful behavior. We're here to keep everyone safe.</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
                  <h3 className="font-bold text-lg mb-2">🌈 Inclusion</h3>
                  <p>Welcome all backgrounds, orientations, and identities with open arms.</p>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500">
                  <h3 className="font-bold text-lg mb-2">✨ Authenticity</h3>
                  <p>Be genuine and honest in your interactions. Authenticity builds real connections.</p>
                </div>
              </div>
            </section>

            {/* Prohibited Behavior */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaFire className="text-red-500" /> Prohibited Behavior
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-red-600 mb-3">❌ Harassment & Abuse</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                    <li>Bullying, name-calling, or threats</li>
                    <li>Discriminatory comments (race, gender, sexuality, etc.)</li>
                    <li>Stalking or repeated unwanted contact</li>
                    <li>Sexual harassment or coercion</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-red-600 mb-3">❌ Fraud & Deception</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                    <li>Fake profiles or catfishing</li>
                    <li>Impersonation of others</li>
                    <li>Misrepresenting your age (must be 18+)</li>
                    <li>Fraudulent verification attempts</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-red-600 mb-3">❌ Explicit Content</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                    <li>Sexually explicit photos or videos</li>
                    <li>Solicitation of sexual content</li>
                    <li>Nude images without consent</li>
                    <li>Links to adult content</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-red-600 mb-3">❌ Spam & Scams</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                    <li>Promotional spam or advertising</li>
                    <li>Multi-level marketing (MLM) schemes</li>
                    <li>Requests for money or personal information</li>
                    <li>Phishing links or malware</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-red-600 mb-3">❌ Violence & Dangerous Content</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
                    <li>Threats of violence</li>
                    <li>Glorification of violence</li>
                    <li>Self-harm content</li>
                    <li>Illegal activities</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* What We Do */}
            <section className="bg-blue-50 p-8 rounded-lg border-l-4 border-blue-500">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What We Do About Violations</h2>
              <ul className="space-y-4 text-gray-700">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-fit">⚠️ Warning:</span>
                  <span>First-time minor violations receive a warning</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-fit">📛 Suspension:</span>
                  <span>Repeated violations or serious offenses result in account suspension</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-fit">🚫 Ban:</span>
                  <span>Severe violations result in permanent account termination</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-fit">📞 Legal:</span>
                  <span>We may report criminal activity to law enforcement</span>
                </li>
              </ul>
            </section>

            {/* Reporting */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🚨 Reporting Violations</h2>
              <p className="mb-4">
                If you encounter behavior that violates these guidelines, please report it immediately using the report button available in chat and on profiles.
              </p>
              <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500">
                <h3 className="font-bold mb-2">When reporting, please include:</h3>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>The user's profile name or ID</li>
                  <li>Clear description of the violation</li>
                  <li>Screenshots or specific messages (if applicable)</li>
                  <li>Date and time of the incident</li>
                </ul>
              </div>
            </section>

            {/* Agreement */}
            <section className="bg-gradient-to-r from-pink-50 to-blue-50 p-8 rounded-lg border-2 border-pink-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">By using EduLove, you agree to:</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Follow these community guidelines</li>
                <li>✓ Respect all users regardless of background</li>
                <li>✓ Report violations promptly</li>
                <li>✓ Not engage in any prohibited behavior</li>
                <li>✓ Accept responsibility for your actions</li>
              </ul>
            </section>

            {/* Support */}
            <section className="text-center bg-gray-50 p-8 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Questions? Need Support?</h3>
              <p className="text-gray-700 mb-4">
                Contact us at support@edulove.com or use our in-app support feature.
              </p>
              <p className="text-sm text-gray-600">
                These guidelines are subject to change. We'll notify users of significant updates.
              </p>
            </section>
          </div>

          {/* Footer Action */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunityGuidelinesPage;
