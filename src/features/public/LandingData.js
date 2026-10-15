export const imageUrl = (id, width = 1100) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

export const heroSlides = [
  { title: 'Every journey.', accent: 'Extraordinary.', label: 'A BETTER WAY TO MOVE', text: 'From your everyday drive to your next big escape. Find a rental that feels like you.', image: 'photo-1503376780353-7e6692767b70', alt: 'Black premium car photographed on the road', category: 'Premium', caption: 'For the journeys you remember.' },
  { title: 'More room.', accent: 'More possibility.', label: 'SPACE FOR YOUR NEXT CHAPTER', text: 'Family weekends, longer stays and everything in between. Make room for the road ahead.', image: 'photo-1519641471654-76ce0107ad1b', alt: 'SUV ready for a road journey', category: 'SUV', caption: 'A little further. All together.' },
  { title: 'Your business.', accent: 'In motion.', label: 'PERSONAL SERVICE. BUSINESS THINKING.', text: 'From one important meeting to a monthly transport plan. Travel around the way you work.', image: 'photo-1555215695-3004980ad54e', alt: 'Executive sedan photographed outdoors', category: 'Sedan', caption: 'A considered arrival, every time.' },
]

export const fleetCategories = ['All vehicles', 'Sedan', 'SUV', 'Premium']
export const rentalPreferences = ['Self-drive', 'With a driver', 'Monthly rental', 'Corporate rental']
export const locations = ['Al Khobar', 'Dammam', 'Riyadh', 'Other destination']

export const fleet = [
  { id: 'executive-sedan', category: 'Sedan', title: 'Everyday, elevated.', subtitle: 'Executive sedan', seats: '4-5 seats', luggage: 'City & business', image: 'photo-1555215695-3004980ad54e', description: 'A comfortable choice for daily travel, city plans and business journeys.' },
  { id: 'premium-suv', category: 'SUV', title: 'Room for the journey.', subtitle: 'Premium SUV', seats: '5-7 seats', luggage: 'Family & travel', image: 'photo-1519641471654-76ce0107ad1b', description: 'Explore spacious options for passenger groups, family travel and longer stays.' },
  { id: 'grand-touring', category: 'Premium', title: 'An exceptional arrival.', subtitle: 'Premium collection', seats: 'Model dependent', luggage: 'Special occasions', image: 'photo-1503376780353-7e6692767b70', description: 'Make your next occasion feel different with a premium rental enquiry.' },
]

export const services = [
  { title: 'Corporate rentals', description: 'Transport that works around your people and projects.', image: 'photo-1449965408869-eaa3f722e40d', icon: 'corporate', preference: 'Corporate rental' },
  { title: 'With a driver', description: 'Set your destination. Let someone else take the wheel.', image: 'photo-1503376780353-7e6692767b70', icon: 'driver', preference: 'With a driver' },
  { title: 'Daily & weekly', description: 'A better drive for everyday plans and weekend escapes.', image: 'photo-1555215695-3004980ad54e', icon: 'calendar', preference: 'Self-drive' },
  { title: 'Monthly rentals', description: 'More time on the road, with a plan shaped around you.', image: 'photo-1519641471654-76ce0107ad1b', icon: 'clock', preference: 'Monthly rental' },
  { title: 'Project transport', description: 'Plan multiple destinations and passenger journeys.', image: 'photo-1449965408869-eaa3f722e40d', icon: 'tracking', preference: 'Corporate rental' },
  { title: 'Occasion travel', description: 'A considered arrival for the moments that matter.', image: 'photo-1503376780353-7e6692767b70', icon: 'reviews', preference: 'With a driver' },
]

export const processSteps = [
  { title: 'Find your drive', text: 'Explore the collection and choose a vehicle category that suits your plans.', icon: 'search' },
  { title: 'Shape your journey', text: 'Choose your dates, pickup location and whether you would like a driver.', icon: 'calendar' },
  { title: 'Confirm & get moving', text: 'Confirm availability, your quotation and rental arrangements with the MAK team.', icon: 'check' },
]

export const faqs = [
  { question: 'Can I book a vehicle online right now?', answer: 'This public page is a preview. You can explore categories and download a rental enquiry, but it does not submit a booking or reserve a vehicle. Availability, pricing and confirmation must be arranged with the MAK team.' },
  { question: 'Can I rent with or without a driver?', answer: 'You can prepare an enquiry for either self-drive or travel with a driver. The team will confirm the available options for your dates and destination.' },
  { question: 'Do you offer monthly and corporate plans?', answer: 'Monthly rentals and corporate transport can be requested. Include your dates, passenger needs, destinations and project details so the team can prepare a suitable quotation.' },
  { question: 'Are the vehicles and prices shown live?', answer: 'The collection uses illustrative photographs and sample categories. Specific models, seating, rates and availability are confirmed when your quotation is prepared.' },
  { question: 'What happens to the enquiry I prepare here?', answer: 'Your enquiry is downloaded as a text file on your device. It is not sent to MAK or stored as a booking. Keep it for your conversation with the team; do not include identity documents or payment information.' },
]
