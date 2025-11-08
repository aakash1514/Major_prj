import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Leaf, ShoppingBag, TruckIcon, Users, 
  BarChart, ArrowRight, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="bg-gradient-to-r from-green-700 to-green-600 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Connect, Grow, and Thrive in Agriculture
              </h1>
              <p className="text-xl mb-8 text-green-50">
                The ultimate marketplace connecting farmers directly with buyers. Quality assured, traceable, and efficient.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button size="lg" variant="secondary">
                    Get Started
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                    Sign In
                  </Button>
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:block"
            >
              <img 
                src="https://images.pexels.com/photos/2255920/pexels-photo-2255920.jpeg" 
                alt="Agricultural marketplace" 
                className="rounded-lg shadow-xl object-cover aspect-4/3"
              />
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform simplifies agricultural commerce with an end-to-end solution
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="p-3 bg-green-100 rounded-full inline-block mb-4">
                <Leaf className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Farmers</h3>
              <p className="text-gray-600 mb-4">
                Register your crops, get them quality-checked, and sell directly to buyers at fair prices.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Easy crop registration</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Professional quality verification</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Direct marketplace access</span>
                </li>
              </ul>
              <Link to="/register">
                <Button variant="outline" className="mt-2" icon={<ArrowRight size={16} />}>
                  Register as Farmer
                </Button>
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="p-3 bg-amber-100 rounded-full inline-block mb-4">
                <ShoppingBag className="h-8 w-8 text-amber-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Buyers</h3>
              <p className="text-gray-600 mb-4">
                Browse quality-assured produce, place orders with confidence, and receive fresh deliveries.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Verified product quality</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Transparent pricing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Reliable delivery tracking</span>
                </li>
              </ul>
              <Link to="/register">
                <Button variant="outline" className="mt-2" icon={<ArrowRight size={16} />}>
                  Register as Buyer
                </Button>
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="p-3 bg-blue-100 rounded-full inline-block mb-4">
                <BarChart className="h-8 w-8 text-blue-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Quality Assurance</h3>
              <p className="text-gray-600 mb-4">
                Our quality agents ensure every crop meets high standards before marketplace listing.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Expert inspection</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Detailed quality reports</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-gray-700">Complete traceability</span>
                </li>
              </ul>
              <Link to="/login">
                <Button variant="outline" className="mt-2" icon={<ArrowRight size={16} />}>
                  Learn More
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Process diagram */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">The Complete Process</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From farm to table, our platform manages every step of the journey
            </p>
          </div>
          
          <div className="relative">
            {/* Process steps */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-green-200 -translate-y-1/2 z-0"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="p-4 bg-green-600 rounded-full text-white mb-4">
                  <Leaf className="h-8 w-8" />
                </div>
                <div className="p-4 bg-white rounded-lg shadow-md w-full">
                  <h3 className="font-semibold mb-2">Crop Registration</h3>
                  <p className="text-sm text-gray-600">Farmers register crops with details and photos</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="p-4 bg-blue-600 rounded-full text-white mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <div className="p-4 bg-white rounded-lg shadow-md w-full">
                  <h3 className="font-semibold mb-2">Quality Inspection</h3>
                  <p className="text-sm text-gray-600">Agents verify crop quality and specifications</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="p-4 bg-amber-600 rounded-full text-white mb-4">
                  <BarChart className="h-8 w-8" />
                </div>
                <div className="p-4 bg-white rounded-lg shadow-md w-full">
                  <h3 className="font-semibold mb-2">Marketplace Listing</h3>
                  <p className="text-sm text-gray-600">Approved crops appear on the marketplace</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="p-4 bg-purple-600 rounded-full text-white mb-4">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <div className="p-4 bg-white rounded-lg shadow-md w-full">
                  <h3 className="font-semibold mb-2">Order & Payment</h3>
                  <p className="text-sm text-gray-600">Buyers place orders with secure payments</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="p-4 bg-red-600 rounded-full text-white mb-4">
                  <TruckIcon className="h-8 w-8" />
                </div>
                <div className="p-4 bg-white rounded-lg shadow-md w-full">
                  <h3 className="font-semibold mb-2">Delivery</h3>
                  <p className="text-sm text-gray-600">Agents coordinate crop delivery to buyers</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      {/* <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Hear from farmers and buyers who've transformed their agricultural business
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/1933873/pexels-photo-1933873.jpeg" 
                  alt="Farmer testimonial" 
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">John Doe</h4>
                  <p className="text-sm text-gray-500">Organic Wheat Farmer</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "Since joining AgriFresh, I've been able to sell my crops at better prices and reach more buyers than ever before. The quality verification process gives my customers confidence."
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg" 
                  alt="Buyer testimonial" 
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">Jane Smith</h4>
                  <p className="text-sm text-gray-500">Restaurant Owner</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "As a restaurant owner, I need consistent quality produce. AgriFresh lets me source directly from farmers with verified quality, and the delivery system is incredibly reliable."
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.pexels.com/photos/874242/pexels-photo-874242.jpeg" 
                  alt="Agent testimonial" 
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">Mike Johnson</h4>
                  <p className="text-sm text-gray-500">Quality Agent</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "Working as a quality agent for AgriFresh has been rewarding. The platform makes it easy to schedule inspections, document findings, and ensure only the best crops reach the marketplace."
              </p>
            </motion.div>
          </div>
        </div>
      </section>
       */}
      {/* CTA section */}
      <section className="py-16 bg-gradient-to-r from-amber-600 to-amber-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to transform your agricultural business?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-amber-50">
            Join AgriFresh today and be part of the future of agricultural commerce.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" variant="primary" className="bg-white text-amber-600 hover:bg-gray-100">
                Register Now
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};