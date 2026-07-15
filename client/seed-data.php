<?php
// ===== ANK HYDRO — Seed Default Site Data =====
// Run once to populate site-data.json with default content

header('Content-Type: application/json');

$dataFile = __DIR__ . '/site-data.json';

$siteData = [
    'settings' => [
        'company' => 'ANK HYDRO LIMITED',
        'tagline' => 'Power of technology, get it right for better tomorrow',
        'phone' => '+254 758 849 293',
        'email' => 'info@ankhydro.com',
        'whatsapp' => '+254 758 849 293',
        'address' => 'Kitui Town, PT Plaza, Room 4, Ground Floor',
        'hours' => 'Mon–Fri: 8AM–5PM, Sat: 8AM–1PM',
        'facebook' => '',
        'instagram' => '',
        'tiktok' => '',
        'linkedin' => '',
        'youtube' => '',
        'twitter' => '',
        'ga' => ''
    ],
    'stats' => [
        'boreholes' => 150,
        'solar' => 200,
        'clients' => 500,
        'counties' => 15
    ],
    'services' => [
        ['id' => 1, 'title' => 'Solar Panel Sales & Installation', 'slug' => 'solar-installation', 'category' => 'Solar Energy', 'description' => 'Professional solar system design, installation, and commissioning.', 'status' => 'published', 'order' => 1],
        ['id' => 2, 'title' => 'Hybrid Domestic Solar System', 'slug' => 'hybrid-solar', 'category' => 'Solar Energy', 'description' => '5.12 kWh battery package with 550W panels and 3000W inverter.', 'status' => 'published', 'order' => 2],
        ['id' => 3, 'title' => 'Hydrological Survey Services', 'slug' => 'hydrological-survey', 'category' => 'Water/Borehole', 'description' => 'Geophysical surveys to locate underground water before drilling.', 'status' => 'published', 'order' => 3],
        ['id' => 4, 'title' => 'Borehole Drilling Services', 'slug' => 'borehole-drilling', 'category' => 'Water/Borehole', 'description' => 'Professional drilling, casing, development, and test pumping.', 'status' => 'published', 'order' => 4],
        ['id' => 5, 'title' => 'Borehole Rehabilitation & Equipping', 'slug' => 'borehole-rehabilitation', 'category' => 'Water/Borehole', 'description' => 'Restoration and upgrade of existing boreholes.', 'status' => 'published', 'order' => 5],
        ['id' => 6, 'title' => 'Submersible Pump Sales & Installation', 'slug' => 'pump-installation', 'category' => 'Pumps', 'description' => 'Electric and solar pump installation with correct sizing.', 'status' => 'published', 'order' => 6],
        ['id' => 7, 'title' => 'Drip & Overhead Irrigation', 'slug' => 'irrigation', 'category' => 'Irrigation', 'description' => 'Farm irrigation systems with efficient water use.', 'status' => 'published', 'order' => 7],
        ['id' => 8, 'title' => 'Tank Tower Construction', 'slug' => 'tank-tower', 'category' => 'Infrastructure', 'description' => 'Steel tower construction for water storage tanks.', 'status' => 'published', 'order' => 8],
        ['id' => 9, 'title' => 'Solar Structure Construction', 'slug' => 'solar-structure', 'category' => 'Infrastructure', 'description' => 'Ground-mount and custom solar panel structures.', 'status' => 'published', 'order' => 9]
    ],
    'packages' => [
        ['id' => 1, 'name' => 'Hybrid Domestic Solar Package', 'price' => 360000, 'priceLabel' => 'FROM KES 360,000', 'category' => 'Solar', 'specs' => '5.12 kWh Lithium Battery, 550W Panels, 3000ES kW Inverter, DC Disconnect, Changeover Switch', 'status' => 'active', 'featured' => true, 'order' => 1],
        ['id' => 2, 'name' => 'Solar Pump 200W', 'price' => 52000, 'priceLabel' => 'FROM KES 52,000', 'category' => 'Pumps', 'specs' => '200W Pump, Controller, 340W Panels, 50M HDPE Pipe, Cables, Transport', 'status' => 'active', 'featured' => false, 'order' => 2],
        ['id' => 3, 'name' => 'Solar Pump 500W', 'price' => 86000, 'priceLabel' => 'FROM KES 86,000', 'category' => 'Pumps', 'specs' => '500W Pump, Controller, 340W Panels, 50M HDPE Pipe, Cables, Transport', 'status' => 'active', 'featured' => false, 'order' => 3],
        ['id' => 4, 'name' => 'Solar Pump 750W', 'price' => 125000, 'priceLabel' => 'FROM KES 125,000', 'category' => 'Pumps', 'specs' => '750W Pump, Controller, 340W Panels, 50M HDPE Pipe, Cables, Transport', 'status' => 'active', 'featured' => false, 'order' => 4],
        ['id' => 5, 'name' => 'Solar Pump 1300W', 'price' => 140000, 'priceLabel' => 'FROM KES 140,000', 'category' => 'Pumps', 'specs' => '1300W Pump, Controller, 340W Panels, 50M HDPE Pipe, Cables, Transport', 'status' => 'active', 'featured' => true, 'order' => 5]
    ],
    'testimonials' => [
        ['id' => 1, 'client' => 'John M.', 'location' => 'Kitui County', 'service' => 'Borehole Drilling', 'text' => 'ANK Hydro drilled our borehole and the water yield exceeded expectations. Professional team and great follow-up support.', 'rating' => 5, 'status' => 'published', 'order' => 1],
        ['id' => 2, 'client' => 'Mary W.', 'location' => 'Machakos County', 'service' => 'Hybrid Solar', 'text' => 'The hybrid solar system has completely changed our electricity situation. No more blackouts and our bills have dropped significantly.', 'rating' => 5, 'status' => 'published', 'order' => 2],
        ['id' => 3, 'client' => 'Peter K.', 'location' => 'Makueni County', 'service' => 'Pump & Irrigation', 'text' => 'They installed a solar-powered pump and set up drip irrigation. Our water costs dropped to zero and crop yield has improved.', 'rating' => 5, 'status' => 'published', 'order' => 3]
    ],
    'team' => [
        ['id' => 1, 'name' => 'Technical Director', 'role' => 'Solar & Water Systems', 'bio' => 'Leading our technical team with years of experience in solar installation and borehole drilling.', 'status' => 'active', 'order' => 1],
        ['id' => 2, 'name' => 'Operations Manager', 'role' => 'Project Delivery', 'bio' => 'Ensuring every project is delivered on time, on budget, and to the highest quality.', 'status' => 'active', 'order' => 2],
        ['id' => 3, 'name' => 'Field Engineers', 'role' => 'Installation & Maintenance', 'bio' => 'Certified technicians handling installations, testing, and after-sales support.', 'status' => 'active', 'order' => 3]
    ],
    'faq' => [
        ['id' => 1, 'question' => 'How much does it cost to drill a borehole in Kenya?', 'answer' => 'Costs typically range from KES 3,500–6,000 per metre drilled.', 'category' => 'Borehole & Water', 'status' => 'published', 'order' => 1],
        ['id' => 2, 'question' => 'What does the Hybrid Domestic Solar Package include?', 'answer' => '5.12 kWh battery, 550W panels, 3000ES kW inverter, DC disconnect, changeover switch — from KES 360,000.', 'category' => 'Solar Energy', 'status' => 'published', 'order' => 2],
        ['id' => 3, 'question' => 'Do you offer after-sales support?', 'answer' => 'Yes, we provide 24/7 availability for breakdowns, servicing, and maintenance.', 'category' => 'General', 'status' => 'published', 'order' => 3]
    ],
    'blog' => [],
    'projects' => [],
    'published_at' => date('c')
];

$result = file_put_contents($dataFile, json_encode($siteData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result !== false) {
    echo json_encode(['success' => true, 'message' => 'Default data seeded', 'size' => $result . ' bytes']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write site-data.json']);
}
