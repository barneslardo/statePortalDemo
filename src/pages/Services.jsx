import { Link } from 'react-router-dom'
import { useOktaAuth } from '@okta/okta-react'

function Services() {
  const { authState } = useOktaAuth()

  const services = [
    {
      id: 'child-support',
      title: 'Child Support',
      description: 'Manage child support payments, view history, and update information',
      icon: '👨‍👩‍👧‍👦',
      path: '/services/child-support',
      color: 'bg-blue-500'
    },
    {
      id: 'snap-assistance',
      title: 'SNAP Assistance',
      description: 'Apply for food assistance benefits and check application status',
      icon: '🛒',
      path: '/services/snap-assistance',
      color: 'bg-green-500'
    },
    {
      id: 'vehicle-registration',
      title: 'Vehicle Registration',
      description: 'Register vehicles, renew registrations, and pay fees online',
      icon: '🚗',
      path: '/services/vehicle-registration',
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome, {authState?.idToken?.claims.name || 'User'}
          </h1>
          <p className="text-xl text-gray-600">
            Select a service to get started
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm">
            <span className="mr-2">✓</span>
            Identity Verified
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <Link
              key={service.id}
              to={service.path}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group"
            >
              <div className={`${service.color} text-white p-6 text-center`}>
                <div className="text-6xl mb-2">{service.icon}</div>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-state-blue transition">
                  {service.title}
                </h2>
                <p className="text-gray-600">
                  {service.description}
                </p>
                <div className="mt-4 text-state-blue font-semibold group-hover:underline">
                  Access Service →
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Need Help?
          </h3>
          <p className="text-gray-600 mb-4">
            If you have questions about any of these services, contact support or visit our FAQ section.
          </p>
          <div className="flex gap-4">
            <button className="text-state-blue hover:underline font-medium">
              Contact Support
            </button>
            <button className="text-state-blue hover:underline font-medium">
              View FAQ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Services
