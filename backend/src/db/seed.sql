-- Seed users
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Sarah Johnson', 'sarah.johnson@sixmend.com', '$2a$10$jm472QIqXFXJEdpUkwQ6KO.R0Fj.QXCAGHdsMhAHGJdJazoeImrIa', 'admin'),
  ('Ravi Kumar', 'ravi.kumar@sixmend.com', '$2a$10$jm472QIqXFXJEdpUkwQ6KO.R0Fj.QXCAGHdsMhAHGJdJazoeImrIa', 'user'),
  ('Priya Nair', 'priya.nair@sixmend.com', '$2a$10$jm472QIqXFXJEdpUkwQ6KO.R0Fj.QXCAGHdsMhAHGJdJazoeImrIa', 'user')
ON CONFLICT (email) DO NOTHING;

-- Seed clients
INSERT INTO clients (name, company, email, phone, address, status, notes) VALUES
  ('James Carter', 'Carter & Co. Logistics', 'james.carter@carterco.com', '+91 98400 11234', '14 Park Street, Chennai, TN 600002', 'active', 'Long-term client. Prefers email communication.'),
  ('Ananya Mehta', 'Mehta Textiles Pvt Ltd', 'ananya@mehtatextiles.in', '+91 99000 22345', '7 Ring Road, Surat, GJ 395001', 'active', 'Interested in bulk orders. Follow up monthly.'),
  ('Thomas Wright', 'Wright Digital Solutions', 'thomas@wrightdigital.com', '+44 7700 900345', '22 Baker Lane, London, UK EC1A 1BB', 'prospect', 'Initial discovery call done. Send proposal.'),
  ('Lakshmi Iyer', 'Iyer Constructions', 'lakshmi.iyer@iyerconstructions.in', '+91 97800 33456', '5 Brigade Road, Bengaluru, KA 560025', 'active', 'Project-based engagement. Payment on milestone.'),
  ('Mohammed Al-Farsi', 'AlFarsi Trading LLC', 'mfarsi@alfarsitrading.ae', '+971 50 123 4567', 'Al Quoz Industrial Area, Dubai, UAE', 'prospect', 'Referred by James Carter. Schedule demo.'),
  ('Deepa Suresh', 'Suresh Pharma Exports', 'deepa@sureshpharma.com', '+91 96600 44567', '33 Anna Salai, Chennai, TN 600018', 'inactive', 'Contract expired. Re-engage next quarter.'),
  ('Nathan Brooks', 'Brooks Consulting Group', 'nathan@brookscg.com', '+1 415 555 0178', '800 Market St, San Francisco, CA 94102, USA', 'active', 'Monthly retainer. Very responsive.'),
  ('Kavya Reddy', 'Reddy Agro Farms', 'kavya.reddy@reddyagro.in', '+91 98500 55678', 'Plot 12, Outer Ring Road, Hyderabad, TS 500032', 'prospect', 'Interested in ERP solution. Budget TBD.')
ON CONFLICT DO NOTHING;

-- Seed enquiries (client_ids will match the inserted clients above)
INSERT INTO enquiries (title, description, client_id, status, priority, value, assigned_to) VALUES
  ('ERP Integration for Logistics Module', 'Carter & Co. wants to integrate our platform with their existing TMS for real-time shipment tracking.', 1, 'in_progress', 'high', 185000.00, 'Ravi Kumar'),
  ('Bulk Order Management System', 'Mehta Textiles requires a module to handle bulk orders with vendor and inventory tracking.', 2, 'proposal_sent', 'medium', 95000.00, 'Priya Nair'),
  ('Digital Transformation Consulting', 'Initial engagement for Wright Digital on migrating legacy systems to cloud infrastructure.', 3, 'new', 'high', 250000.00, 'Sarah Johnson'),
  ('Construction Project Tracker', 'Custom dashboard for tracking multiple construction projects, milestones, and subcontractor payments.', 4, 'in_progress', 'high', 140000.00, 'Ravi Kumar'),
  ('Product Demo – Trading Platform', 'Schedule and conduct product demo for AlFarsi Trading. Prepare Arabic locale support notes.', 5, 'new', 'low', 0.00, 'Priya Nair'),
  ('Contract Renewal – Pharma Exports', 'Re-engagement call with Deepa Suresh for annual support contract renewal.', 6, 'on_hold', 'low', 48000.00, 'Sarah Johnson'),
  ('Monthly Reporting Dashboard', 'Brooks Consulting needs automated monthly KPI reports with PDF export capability.', 7, 'completed', 'medium', 62000.00, 'Ravi Kumar'),
  ('Agro Supply Chain Module', 'Reddy Agro Farms exploring end-to-end supply chain visibility. Feasibility study phase.', 8, 'new', 'medium', 120000.00, 'Priya Nair'),
  ('Mobile App for Field Agents', 'Carter & Co. field agents need a mobile companion app for delivery confirmations.', 1, 'proposal_sent', 'high', 210000.00, 'Sarah Johnson'),
  ('Annual Maintenance Contract', 'Iyer Constructions AMC renewal covering bug fixes, updates, and on-call support.', 4, 'completed', 'low', 36000.00, 'Ravi Kumar')
ON CONFLICT DO NOTHING;

-- Seed expenses
INSERT INTO expenses (title, category, amount, expense_date, description, status) VALUES
  ('AWS Cloud Hosting – July', 'Infrastructure', 18500.00, '2026-07-01', 'Monthly AWS EC2 and RDS charges for production environment.', 'approved'),
  ('Team Lunch – Q2 Review', 'Meals & Entertainment', 3200.00, '2026-06-28', 'Team lunch at Mainland China, Chennai post Q2 review meeting.', 'approved'),
  ('Figma Pro Subscription', 'Software', 4200.00, '2026-07-05', 'Annual Figma Pro plan for design team (3 seats).', 'approved'),
  ('Flight – Mumbai Client Visit', 'Travel', 9800.00, '2026-07-10', 'Return flight for Sarah Johnson to Mumbai for Mehta Textiles meeting.', 'approved'),
  ('Office Supplies – July', 'Office', 1450.00, '2026-07-12', 'Stationery, printer cartridges, and miscellaneous office supplies.', 'approved'),
  ('Google Workspace – August', 'Software', 6300.00, '2026-08-01', 'Monthly Google Workspace Business Standard for 15 users.', 'pending'),
  ('Hotel – Dubai Trip', 'Travel', 22000.00, '2026-08-02', '3-night stay at Holiday Inn Express Dubai for AlFarsi demo visit.', 'pending'),
  ('Freelance Designer – Landing Page', 'Contractor', 15000.00, '2026-07-20', 'One-time payment to freelance designer for marketing landing page redesign.', 'approved'),
  ('LinkedIn Ads – July Campaign', 'Marketing', 11200.00, '2026-07-15', 'LinkedIn sponsored posts targeting logistics and pharma decision-makers.', 'approved'),
  ('Laptop – New Hire', 'Equipment', 68000.00, '2026-07-25', 'Dell XPS 15 for new frontend developer joining August batch.', 'pending'),
  ('Slack Pro Plan', 'Software', 2800.00, '2026-08-01', 'Monthly Slack Pro for team communication (20 users).', 'approved'),
  ('Client Gift – Brooks Consulting', 'Meals & Entertainment', 4500.00, '2026-07-30', 'Customised gift hamper for Nathan Brooks on contract renewal.', 'approved')
ON CONFLICT DO NOTHING;
