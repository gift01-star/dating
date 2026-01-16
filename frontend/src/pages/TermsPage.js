import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart } from 'react-icons/fa';

function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center space-x-4">
          <button onClick={() => navigate('/')} className="text-pink-500 hover:text-pink-600 transition">
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
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>

          <div className="space-y-8 text-gray-700">
            {/* 1. Agreement */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="mb-4">
                By accessing and using the EduLove platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
              <p>
                EduLove reserves the right to change these terms at any time. It is your responsibility to review these terms regularly for changes. Your continued use of the Service following the posting of changes will mean that you accept and agree to the changes.
              </p>
            </section>

            {/* 2. Use License */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use License</h2>
              <p className="mb-4">
                Permission is granted to temporarily download one copy of the materials (information or software) on EduLove for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modifying or copying the materials</li>
                <li>Using the materials for any commercial purpose or for any public display</li>
                <li>Attempting to decompile or reverse engineer any software contained on EduLove</li>
                <li>Removing any copyright or other proprietary notations from the materials</li>
                <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
                <li>Violating any laws or regulations related to the access of the Service</li>
              </ul>
            </section>

            {/* 3. Disclaimer */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Disclaimer</h2>
              <p className="mb-4">
                The materials on EduLove are provided on an 'as is' basis. EduLove makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
              <p>
                EduLove shall not be responsible for any damages or liability arising out of or in connection with the use of the Service, including but not limited to, damages caused by viruses, malware, or any other harmful components.
              </p>
            </section>

            {/* 4. Limitations */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Limitations of Liability</h2>
              <p className="mb-4">
                In no event shall EduLove or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on EduLove, even if EduLove or an authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            {/* 5. Accuracy of Materials */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Accuracy of Materials</h2>
              <p>
                The materials appearing on EduLove could include technical, typographical, or photographic errors. EduLove does not warrant that any of the materials on the platform are accurate, complete, or current. EduLove may make changes to the materials contained on the platform at any time without notice.
              </p>
            </section>

            {/* 6. Materials and Content */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Materials and Content</h2>
              <p className="mb-4">
                The materials on EduLove are protected by copyright law and trade secret law. You agree that you will not modify, copy, or use any materials for any purpose other than viewing the materials on the platform.
              </p>
              <p>
                You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                <li>Post false, misleading, or offensive content</li>
                <li>Harass, abuse, or threaten other users</li>
                <li>Post explicit or pornographic material</li>
                <li>Post content that infringes on others' rights</li>
                <li>Use automated tools to access the platform</li>
                <li>Attempt to circumvent security measures</li>
              </ul>
            </section>

            {/* 7. User Accounts */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. User Accounts and Registration</h2>
              <p className="mb-4">
                When you create an account on EduLove, you must provide accurate, complete, and current information. You are responsible for maintaining the confidentiality of your password and for all activities that occur under your account.
              </p>
              <p>
                You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                <li>Be at least 18 years old</li>
                <li>Provide true and accurate information</li>
                <li>Maintain your password confidentiality</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Use the platform only for lawful purposes</li>
              </ul>
            </section>

            {/* 8. User Conduct */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. User Conduct</h2>
              <p className="mb-4">
                You agree that you will not use the EduLove platform to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Transmit any unlawful, threatening, abusive, defamatory, or obscene content</li>
                <li>Attempt to gain unauthorized access to the platform</li>
                <li>Interfere with or disrupt the platform or its servers</li>
                <li>Engage in any form of harassment or intimidation</li>
                <li>Impersonate any person or entity</li>
                <li>Post content that violates any laws or regulations</li>
                <li>Engage in commercial activities without authorization</li>
              </ul>
            </section>

            {/* 9. Termination */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Termination</h2>
              <p className="mb-4">
                EduLove may terminate or suspend your account and access to the platform without prior notice or liability for any reason whatsoever, including if you breach the Terms of Service.
              </p>
              <p>
                Upon termination, your right to use the platform will immediately cease. EduLove will not be liable to you or any third party for termination of your access to the platform.
              </p>
            </section>

            {/* 10. Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Privacy Policy</h2>
              <p>
                Your use of EduLove is also governed by our Privacy Policy. Please review the Privacy Policy to understand our practices. You can find our complete Privacy Policy{' '}
                <a href="https://github.com/gift01-star/dating/blob/main/docs/PRIVACY_POLICY.md" target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-600 underline">
                  here
                </a>
                .
              </p>
            </section>

            {/* 11. Third Party Links */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Third-Party Links</h2>
              <p>
                EduLove may contain links to third-party websites. EduLove is not responsible for the content, accuracy, or practices of these external sites. Your use of third-party websites is subject to their terms and conditions.
              </p>
            </section>

            {/* 12. Dispute Resolution */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Dispute Resolution</h2>
              <p className="mb-4">
                Any disputes arising from or relating to these Terms of Service or the use of EduLove shall be resolved through binding arbitration or in the courts of your jurisdiction, at your election.
              </p>
            </section>

            {/* 13. Modification */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Modification of Terms</h2>
              <p>
                EduLove reserves the right to modify these Terms of Service at any time. Continued use of the platform following notification of changes shall constitute your acceptance of the modified terms.
              </p>
            </section>

            {/* 14. Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="mb-2">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="mb-1"><strong>Email:</strong> support@edulove.com</p>
              <p className="mb-1"><strong>Phone:</strong> +265 982 780 024</p>
              <p><strong>Address:</strong> EduLove, Blantyre, Malawi</p>
            </section>

            {/* Effective Date */}
            <section className="bg-pink-50 p-6 rounded-lg border border-pink-200 mt-8">
              <p className="text-gray-700">
                <strong>Effective Date:</strong> January 15, 2026
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Last Updated:</strong> January 15, 2026
              </p>
            </section>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-12">
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-6 py-3 border-2 border-pink-500 text-pink-500 rounded-lg hover:bg-pink-50 transition font-semibold"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate('/register')}
              className="flex-1 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-semibold"
            >
              I Accept & Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsPage;
