import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaUsers, FaComment, FaShieldAlt, FaStar, FaArrowRight } from 'react-icons/fa';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FaHeart className="text-3xl text-pink-500" />
            <span className="text-2xl font-bold text-gray-800">EduLove</span>
          </div>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 text-gray-700 hover:text-pink-500 font-medium transition"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-medium"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Meet Your Perfect Match
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect with like-minded students at your university. Find your perfect match through genuine conversations and shared interests.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-semibold flex items-center space-x-2"
              >
                <span>Get Started</span>
                <FaArrowRight />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 border-2 border-pink-500 text-pink-500 rounded-lg hover:bg-pink-50 transition font-semibold"
              >
                Already Have an Account
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl blur-2xl opacity-30"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl p-8">
                <FaHeart className="text-6xl text-pink-500 mb-4" />
                <p className="text-gray-600">Join thousands of students finding love on EduLove</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Why Choose EduLove?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-2xl hover:shadow-lg transition">
              <FaUsers className="text-4xl text-pink-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">University-Exclusive</h3>
              <p className="text-gray-600">
                Connect exclusively with students from your university. Build relationships with people who understand your campus life.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-2xl hover:shadow-lg transition">
              <FaComment className="text-4xl text-pink-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Real Conversations</h3>
              <p className="text-gray-600">
                Chat with your matches in real-time. Share interests, learn about each other, and build genuine connections.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-2xl hover:shadow-lg transition">
              <FaShieldAlt className="text-4xl text-pink-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Safe & Secure</h3>
              <p className="text-gray-600">
                Your safety is our priority. Report inappropriate behavior and block users to maintain a safe dating environment.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-2xl hover:shadow-lg transition">
              <FaStar className="text-4xl text-pink-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Matching</h3>
              <p className="text-gray-600">
                Our matching system pairs you with compatible users based on interests, preferences, and location.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-2xl hover:shadow-lg transition">
              <FaHeart className="text-4xl text-pink-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Mutual Likes</h3>
              <p className="text-gray-600">
                When two people like each other, it's a match! Start conversations with people who are interested in you.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-2xl hover:shadow-lg transition">
              <FaUsers className="text-4xl text-pink-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Community Driven</h3>
              <p className="text-gray-600">
                Be part of a thriving community of students looking for meaningful connections and relationships.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gradient-to-br from-pink-50 to-rose-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-pink-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sign Up</h3>
              <p className="text-gray-600">Create your profile with your interests and preferences</p>
            </div>
            
            <div className="text-center">
              <div className="bg-pink-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Discover</h3>
              <p className="text-gray-600">Browse profiles and find people you're interested in</p>
            </div>
            
            <div className="text-center">
              <div className="bg-pink-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Like & Match</h3>
              <p className="text-gray-600">Like profiles and match when both of you like each other</p>
            </div>
            
            <div className="text-center">
              <div className="bg-pink-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Connect</h3>
              <p className="text-gray-600">Start chatting and build meaningful relationships</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-pink-500 mb-2">10,000+</p>
              <p className="text-xl text-gray-600">Active Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-pink-500 mb-2">50,000+</p>
              <p className="text-xl text-gray-600">Matches Made</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-pink-500 mb-2">500+</p>
              <p className="text-xl text-gray-600">Happy Couples</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-pink-500 to-rose-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Find Your Match?</h2>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            Join thousands of students already finding love and meaningful connections on EduLove.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-white text-pink-500 rounded-lg hover:bg-gray-100 transition font-bold text-lg"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FaHeart className="text-2xl text-pink-500" />
                <span className="text-xl font-bold">EduLove</span>
              </div>
              <p className="text-gray-400">Connect with students at your university</p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/login" className="hover:text-white transition">Login</a></li>
                <li><a href="/register" className="hover:text-white transition">Sign Up</a></li>
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/terms')} className="hover:text-white transition text-left">Terms & Conditions</button></li>
                <li><a href="https://github.com/gift01-star/dating/blob/main/docs/PRIVACY_POLICY.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="https://github.com/gift01-star/dating/blob/main/docs/COMMUNITY_GUIDELINES.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Community Guidelines</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:support@edulove.com" className="hover:text-white transition">support@edulove.com</a></li>
                <li><a href="tel:+265982780024" className="hover:text-white transition">+265 982 780 024</a></li>
                <li>24/7 Customer Support</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400">&copy; 2026 EduLove. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white transition">Facebook</a>
                <a href="#" className="text-gray-400 hover:text-white transition">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white transition">Instagram</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
