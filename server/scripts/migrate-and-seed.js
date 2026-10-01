#!/usr/bin/env node

/**
 * Migration & Seed Script
 * -----------------------
 * 1. Backs up CMS collections from the OLD database to local JSON files.
 * 2. Copies users, departments, feedbacks to the NEW database (cms_db).
 * 3. Copies existing complaints AND generates ~90 new realistic complaints
 *    spread across the past 4 months with realistic status progressions.
 *
 * Usage: node scripts/migrate-and-seed.js
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ── Config ──────────────────────────────────────────────────────────────────
const OLD_URI = process.env.MIGRATION_SOURCE_MONGODB_URI;
const NEW_URI = process.env.MIGRATION_TARGET_MONGODB_URI || process.env.MONGODB_URI;

const BACKUP_DIR = path.join(__dirname, '..', 'backups', new Date().toISOString().slice(0, 10));

const CMS_COLLECTIONS = ['users', 'departments', 'complaints', 'feedbacks'];

// The user account that will "own" the seeded complaints
const SEED_USER_EMAIL = 'shubhamsomwanshi2003@gmail.com';

// ── Helpers ─────────────────────────────────────────────────────────────────
const log = (msg) => console.log(`\x1b[36m[migrate]\x1b[0m ${msg}`);
const ok = (msg) => console.log(`\x1b[32m  ✅ ${msg}\x1b[0m`);
const warn = (msg) => console.log(`\x1b[33m  ⚠️  ${msg}\x1b[0m`);
const err = (msg) => console.log(`\x1b[31m  ❌ ${msg}\x1b[0m`);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// ── Complaint Templates ─────────────────────────────────────────────────────
// Realistic complaints mapped to department categories
const COMPLAINT_TEMPLATES = {
  'Accounts Department': {
    'Fee Payment Issue': [
      { title: 'Fee payment failed but amount deducted', description: 'I tried to pay my semester fee via the online portal but the payment failed after debiting ₹45,000 from my account. Transaction ID shows successful on bank side but portal shows pending. Please refund or update my payment status.', urgency: 'high' },
      { title: 'Unable to pay fees online', description: 'The fee payment portal is showing an error when I try to make the payment. It says "Transaction could not be processed." I have tried multiple times with different payment methods but nothing works.', urgency: 'medium' },
      { title: 'Double fee deducted from account', description: 'While paying the exam fee of ₹2,500, the amount was deducted twice from my bank account. I need one of the payments to be refunded immediately.', urgency: 'high' },
    ],
    'Refund Request': [
      { title: 'Hostel fee refund not received', description: 'I cancelled my hostel accommodation two months ago and was told the refund would be processed within 15 working days. It has been over 45 days and I still haven\'t received any refund. Application reference: HR-2026-0413.', urgency: 'medium' },
      { title: 'Excess fee paid needs refund', description: 'I accidentally paid the fee twice for the current semester. Please process a refund for the duplicate payment. My student ID is ST2024156.', urgency: 'medium' },
    ],
    'Scholarship Issue': [
      { title: 'Scholarship amount not credited', description: 'My scholarship was approved 3 months ago but the amount has not been credited to my account yet. Other students who applied at the same time have already received their payments. My scholarship ID is SCH-2026-078.', urgency: 'medium' },
      { title: 'Scholarship application status unclear', description: 'I submitted my scholarship application for the merit-based grant over 6 weeks ago and have received no update. The portal still shows "Under Review." Need clarity on the timeline.', urgency: 'low' },
    ],
    'Receipt Generation': [
      { title: 'Fee receipt not generated', description: 'I paid my tuition fee last week via NEFT transfer but the fee receipt has not been generated on the portal. I need the receipt for my education loan documentation.', urgency: 'medium' },
    ],
    'Payment Gateway Issue': [
      { title: 'Payment gateway timeout during fee payment', description: 'The payment gateway keeps timing out when I try to pay my fees. I have tried on Chrome, Firefox, and Edge but get the same issue. The error says "Gateway Timeout - please try again later."', urgency: 'high' },
    ],
    'Fine Related Issue': [
      { title: 'Incorrect late fee charged', description: 'I was charged a late fee of ₹500 even though I paid my fees before the deadline. I have the bank statement showing the payment was made on the 14th, but the system shows it was received on the 18th.', urgency: 'medium' },
    ],
  },
  'Information Technology (IT) Department': {
    'Software Issue': [
      { title: 'Microsoft Office license expired on lab computers', description: 'The Microsoft Office license on all computers in Lab 4 has expired. Students cannot open Word, Excel, or PowerPoint files. This is affecting ongoing assignments.', urgency: 'high' },
      { title: 'Antivirus software blocking educational websites', description: 'The antivirus software on lab computers is blocking access to legitimate educational websites like GeeksforGeeks and W3Schools. Students need these for their coursework.', urgency: 'medium' },
      { title: 'VS Code not installed in programming lab', description: 'The programming lab computers do not have VS Code installed. Students are required to use it for their Data Structures practical assignments. Only Notepad is available.', urgency: 'medium' },
    ],
    'Hardware Issue': [
      { title: 'Multiple monitors not working in Lab 2', description: 'Five monitors in Lab 2 (positions 7, 12, 18, 23, 30) are showing no display even though the CPUs are working fine. Students have to share workstations during practicals.', urgency: 'high' },
      { title: 'Keyboard and mouse missing from workstations', description: 'Several workstations in Lab 5 are missing keyboards and mice. This makes it impossible for students to complete their practical work.', urgency: 'medium' },
    ],
    'Network Problem': [
      { title: 'Wi-Fi extremely slow in academic building', description: 'The Wi-Fi in the main academic building has been extremely slow for the past week. Speed test shows only 0.5 Mbps download, making it impossible to access online resources during lectures.', urgency: 'high' },
      { title: 'Campus Wi-Fi disconnects frequently', description: 'The campus Wi-Fi keeps disconnecting every 5-10 minutes. This is very frustrating during online assessments and research work. The issue is consistent across all devices.', urgency: 'medium' },
    ],
    'Internet Connectivity': [
      { title: 'No internet access in new wing classrooms', description: 'The classrooms in the newly constructed wing (rooms N-101 to N-110) do not have any internet connectivity. LAN ports are installed but not active, and Wi-Fi coverage does not reach there.', urgency: 'high' },
      { title: 'Internet not working in Computer Lab', description: 'The internet connection in Computer Lab 3 has not been working since yesterday. Students are unable to access online resources and complete practical assignments.', urgency: 'medium' },
    ],
    'Lab System Issue': [
      { title: 'Lab PCs running extremely slow', description: 'All computers in Lab 1 have become extremely slow. Programs take 5-10 minutes to open and the systems frequently freeze. Seems like a RAM or storage issue affecting the entire lab.', urgency: 'high' },
      { title: 'Printer in lab not functioning', description: 'The shared printer in the computer lab has not been working for over a week. Students need to print assignments and reports. Error message shows "Printer offline."', urgency: 'medium' },
    ],
  },
  'Computer Engineering Department': {
    'Computer Lab Issue': [
      { title: 'Air conditioning broken in Lab 3', description: 'The air conditioning unit in Computer Lab 3 has stopped working. The temperature inside reaches 38°C during afternoon sessions, making it unbearable for students during 2-hour practicals.', urgency: 'high' },
      { title: 'Projector not working in Lab 1', description: 'The projector in Computer Lab 1 is displaying a yellow tint and the image is very dim. Faculty cannot demonstrate programs properly during practical sessions.', urgency: 'medium' },
    ],
    'Software Installation': [
      { title: 'Python and Anaconda not installed', description: 'Python 3 and Anaconda distribution are not installed on any of the lab computers. Our Machine Learning course requires these tools for the upcoming practical exam.', urgency: 'high' },
      { title: 'Outdated compiler versions', description: 'The GCC compiler on lab systems is version 4.8 while our coursework requires GCC 9+. Students are unable to use modern C++ features required for assignments.', urgency: 'medium' },
    ],
    'Project Equipment': [
      { title: 'Raspberry Pi kits not available for IoT project', description: 'Our team submitted a request for Raspberry Pi kits for our final year IoT project 3 weeks ago but we still haven\'t received them. The project submission deadline is approaching.', urgency: 'high' },
    ],
    'Internet Access': [
      { title: 'GitHub blocked on campus network', description: 'GitHub.com has been blocked on the campus network since last Monday. Students are unable to access their project repositories or submit code for coursework.', urgency: 'high' },
    ],
    'Smart Board Issue': [
      { title: 'Smart board touch not responding', description: 'The smart board in room C-305 has a non-responsive touch panel. Faculty have to use the mouse connected to the computer instead, which slows down lectures significantly.', urgency: 'medium' },
    ],
  },
  'Electrical Department': {
    'Power Failure': [
      { title: 'Frequent power cuts in Block B', description: 'Block B is experiencing frequent power cuts, sometimes 3-4 times a day, lasting 15-30 minutes each. This is disrupting classes and lab work. The UPS systems are also not holding charge.', urgency: 'high' },
      { title: 'Power outage in entire ground floor', description: 'The entire ground floor of the main building has been without power since this morning. No lights, fans, or electrical equipment is working. It appears to be a main line issue.', urgency: 'high' },
    ],
    'Faulty Switch': [
      { title: 'Exposed wiring near switchboard in hallway', description: 'The switchboard near the staircase on the 2nd floor has exposed wires coming out. This is a serious safety hazard for students passing by. Please repair it urgently.', urgency: 'high' },
      { title: 'Switches sparking in classroom', description: 'Two switches in classroom E-201 are sparking when turned on. One of them makes a loud popping sound. We stopped using them but this needs urgent attention for safety.', urgency: 'high' },
    ],
    'Fan Not Working': [
      { title: 'Ceiling fans not working in Exam Hall', description: 'Three ceiling fans in Exam Hall 2 are not working. With summer temperatures, it becomes very uncomfortable for students during exams lasting 3 hours.', urgency: 'medium' },
      { title: 'Fan making loud noise in classroom', description: 'The ceiling fan in classroom E-103 is making an extremely loud grinding noise. It is very distracting during lectures. The fan seems to be wobbling too.', urgency: 'low' },
    ],
    'Light Not Working': [
      { title: 'Corridor lights not functioning', description: 'Multiple lights in the corridor of the 3rd floor of Block A are not working, making it very dark during evening hours. Students have difficulty navigating especially during winter.', urgency: 'medium' },
      { title: 'Classroom lights flickering constantly', description: 'The tube lights in classroom E-302 keep flickering, causing headaches and eye strain for students sitting in the class for extended periods. All four lights have this issue.', urgency: 'medium' },
    ],
    'Wiring Issue': [
      { title: 'Loose wiring in computer lab', description: 'There are loose electrical wires hanging from the ceiling in the back section of Computer Lab 6. Some cables are within reach of students seated at workstations.', urgency: 'high' },
    ],
    'Electrical Safety': [
      { title: 'No earthing in lab equipment', description: 'The metal casing of several machines in the Electrical Workshop gives mild electric shocks when touched. It seems like the earthing is not working properly, posing a safety risk.', urgency: 'high' },
    ],
  },
  'Civil Engineering Department': {
    'Building Damage': [
      { title: 'Ceiling plaster falling in lecture hall', description: 'Large chunks of plaster have started falling from the ceiling of Lecture Hall C-101. This is extremely dangerous for students sitting below. A piece fell during a lecture yesterday.', urgency: 'high' },
      { title: 'Wall cracks in Block C ground floor', description: 'Significant cracks have appeared on the walls of Block C ground floor, especially near the columns. Some cracks are wide enough to fit a finger. This might be a structural concern.', urgency: 'high' },
    ],
    'Classroom Maintenance': [
      { title: 'Broken windows in classroom', description: 'Two windows in classroom C-204 have broken glass panes. During rain, water enters the classroom and wets the benches and floor, making it unusable.', urgency: 'medium' },
      { title: 'Classroom door lock broken', description: 'The door lock of classroom C-107 is broken. The door cannot be locked, which is a security concern for the equipment kept inside including the projector and audio system.', urgency: 'medium' },
    ],
    'Drainage Issue': [
      { title: 'Waterlogging near canteen area', description: 'Every time it rains, the area near the canteen gets severely waterlogged. Water enters the canteen and the pathway becomes impassable. The drainage system seems to be clogged.', urgency: 'medium' },
      { title: 'Sewage overflow near Boys Hostel', description: 'The sewage drain near Boys Hostel Block 2 has been overflowing for 3 days. The smell is unbearable and it is creating an unhygienic environment for hostel residents.', urgency: 'high' },
    ],
    'Washroom Maintenance': [
      { title: 'Washroom taps leaking continuously', description: 'All the taps in the 2nd floor washroom of Block A are leaking continuously. This is wasting a huge amount of water daily. The floor is always wet, creating a slipping hazard.', urgency: 'medium' },
      { title: 'Girls washroom on 3rd floor not functional', description: 'The girls washroom on the 3rd floor of the main building has been non-functional for two weeks. The flush system is broken and there is no running water. Female students have to go to other floors.', urgency: 'high' },
    ],
    'Furniture Damage': [
      { title: 'Broken desks in classroom', description: 'Around 15 desks in classroom C-205 are broken or wobbly. Students cannot write properly during exams. Some benches have sharp broken edges that could cause injuries.', urgency: 'medium' },
    ],
    'Construction Safety': [
      { title: 'Construction debris blocking pathway', description: 'The ongoing construction work near Block D has left debris and construction materials on the main student pathway. There are no barricades or warning signs, creating a safety hazard.', urgency: 'high' },
    ],
  },
  'Mechanical Engineering Department': {
    'Machine Breakdown': [
      { title: 'CNC machine not functioning', description: 'The CNC milling machine in the workshop has broken down. It shows an error code E-401 and will not start. Final year students need this machine for their project work.', urgency: 'high' },
      { title: 'Lathe machine vibrating excessively', description: 'The lathe machine (Machine #3) in the workshop is vibrating excessively during operation. This is producing inaccurate workpieces and could be dangerous if the vibration worsens.', urgency: 'high' },
    ],
    'Workshop Equipment': [
      { title: 'Welding equipment safety gear missing', description: 'The welding section is missing several safety helmets and gloves. Students cannot perform welding practicals without proper safety equipment. Only 3 out of 10 sets are available.', urgency: 'high' },
      { title: 'Drilling machine chuck jammed', description: 'The chuck of the drilling machine in Workshop Bay 2 is jammed and cannot be opened to change drill bits. Workshop staff have tried to fix it but it needs professional repair.', urgency: 'medium' },
    ],
    'Tool Availability': [
      { title: 'Insufficient measuring tools for practicals', description: 'The department does not have enough vernier calipers and micrometers for the Metrology lab. Only 8 sets are available for a batch of 30 students.', urgency: 'medium' },
    ],
    'Laboratory Maintenance': [
      { title: 'Fluid mechanics lab equipment leaking', description: 'Multiple experimental setups in the Fluid Mechanics lab are leaking water. The venturimeter and orifice meter setups have corroded pipes that need replacement.', urgency: 'medium' },
    ],
    'Equipment Calibration': [
      { title: 'Strain gauges giving incorrect readings', description: 'The strain gauge equipment in the Strength of Materials lab is giving inconsistent and incorrect readings. Last calibration was done over a year ago. This affects experiment accuracy.', urgency: 'medium' },
    ],
  },
  'Library Department': {
    'Book Availability': [
      { title: 'Textbooks for Data Structures not available', description: 'The recommended textbook "Data Structures Using C" by Reema Thareja is not available in the library. All copies have been issued and the waiting list has 25+ students. Can the library procure more copies?', urgency: 'medium' },
      { title: 'Reference books for GATE preparation needed', description: 'The library does not have sufficient GATE preparation books for Computer Science. Many students are preparing for GATE and the few copies available are always issued out.', urgency: 'low' },
    ],
    'Book Damage': [
      { title: 'Received damaged book from library', description: 'I was issued a copy of "Engineering Mathematics" that has 30 pages torn and the binding is coming apart. Now the library says I damaged it and wants me to pay for replacement.', urgency: 'medium' },
    ],
    'Digital Library Access': [
      { title: 'NPTEL video lectures not accessible', description: 'The NPTEL video lecture portal is not accessible from the digital library terminals. It shows "Access Denied." Students need these for supplementary learning and exam prep.', urgency: 'medium' },
      { title: 'IEEE/Springer journal access not working', description: 'Cannot access IEEE Xplore and Springer journals from the library or campus network. The institutional subscription seems to have expired. Final year students need research papers.', urgency: 'high' },
    ],
    'Reading Room Issue': [
      { title: 'Reading room AC not working', description: 'The air conditioning in the library reading room has not been working for a week. The room becomes extremely hot in the afternoon, making it impossible to study.', urgency: 'medium' },
      { title: 'Insufficient seating in reading room', description: 'The library reading room has only 40 seats for a student body of 500+. During exam season, students have to sit on the floor or cannot find a spot at all.', urgency: 'low' },
    ],
    'System Access Problem': [
      { title: 'Library OPAC system not working', description: 'The Online Public Access Catalog (OPAC) system has been down for 3 days. Students cannot search for books or check availability before visiting the library.', urgency: 'medium' },
    ],
    'Library Staff Complaint': [
      { title: 'Rude behavior by library counter staff', description: 'The staff at the book issue counter was very rude when I asked about reserving a book. I was told to "figure it out myself" without any assistance. This is not acceptable behavior.', urgency: 'low' },
    ],
  },
  'Hostel Department': {
    'Room Maintenance': [
      { title: 'Door lock broken in hostel room', description: 'The door lock of Room 312 in Boys Hostel Block A has been broken for a week. I cannot lock my room when I leave for classes. My valuables are at risk. No one has come to fix it despite complaints.', urgency: 'high' },
      { title: 'Window glass broken in room 205', description: 'The window glass in room 205 of Girls Hostel is broken. Mosquitoes and insects come in at night and during rain, water enters the room. Please get it replaced.', urgency: 'medium' },
    ],
    'Water Supply': [
      { title: 'No hot water in hostel bathrooms', description: 'The hot water supply in Boys Hostel Block B has not been working for 10 days. Bathing with cold water in winter is causing health issues for many students.', urgency: 'high' },
      { title: 'Irregular water supply on 3rd floor', description: 'The 3rd floor of Girls Hostel has been receiving water for only 2 hours a day instead of the regular schedule. Students have to store water in buckets, which is very inconvenient.', urgency: 'medium' },
    ],
    'Mess Complaint': [
      { title: 'Poor food quality in hostel mess', description: 'The food quality in the hostel mess has deteriorated significantly. Yesterday\'s dinner had undercooked dal and stale rotis. Several students complained of stomach issues. The overall hygiene has also declined.', urgency: 'high' },
      { title: 'Insects found in mess food', description: 'I found two insects in my dinner plate today at the hostel mess. This is extremely unhygienic and unacceptable. Other students have also reported similar incidents this week.', urgency: 'high' },
      { title: 'Mess timing too short for dinner', description: 'The dinner window at the hostel mess is only from 7:30 PM to 8:30 PM. Students who have late labs (ending at 8 PM) frequently miss dinner. Can the timing be extended to at least 9 PM?', urgency: 'low' },
    ],
    'Cleanliness': [
      { title: 'Washrooms not cleaned regularly', description: 'The common washrooms on the 2nd floor of Boys Hostel are not being cleaned regularly. The toilets are in a terrible condition and there is no soap or toilet paper provided. Very unhygienic.', urgency: 'high' },
      { title: 'Garbage not collected from hostel floors', description: 'The garbage bins on the 4th floor of Girls Hostel have not been emptied for 4 days. The corridor smells bad and flies are everywhere. Housekeeping seems to skip this floor regularly.', urgency: 'medium' },
    ],
    'Internet Issue': [
      { title: 'No Wi-Fi signal in hostel rooms', description: 'The Wi-Fi signal does not reach rooms beyond room 320 on the 3rd floor of Boys Hostel. Students in those rooms have to go to the common area to access internet, which is very inconvenient at night.', urgency: 'medium' },
    ],
    'Security Issue': [
      { title: 'CCTV cameras not working in hostel', description: 'Multiple CCTV cameras in Boys Hostel Block A are not working. There was a theft incident last week and when we checked, the cameras had not been recording. Security is compromised.', urgency: 'high' },
    ],
  },
};

// Fake student names for creating diverse complaint authors
const STUDENT_NAMES = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Deshmukh', 'Sneha Kulkarni', 'Vikram Singh',
  'Ananya Joshi', 'Arjun Mehta', 'Kavita Reddy', 'Siddharth Nair', 'Meera Gupta',
  'Rahul Verma', 'Pooja Mishra', 'Aditya Chauhan', 'Neha Agarwal', 'Kunal Shah',
  'Tanvi Bhatt', 'Harsh Pandey', 'Simran Kaur', 'Deepak Yadav', 'Riya Kapoor',
  'Manish Kumar', 'Shruti Iyer', 'Akash Tiwari', 'Divya Nayak', 'Varun Gaikwad',
];

// ── Main Script ─────────────────────────────────────────────────────────────
async function main() {
  if (!OLD_URI || !NEW_URI) {
    throw new Error('Set MIGRATION_SOURCE_MONGODB_URI and MIGRATION_TARGET_MONGODB_URI (or MONGODB_URI) in server/.env before running.');
  }

  log('Starting migration and seed process...\n');

  // ── Step 1: Backup from old DB ──────────────────────────────────────────
  log('Step 1: Backing up data from OLD database...');
  const oldConn = await mongoose.createConnection(OLD_URI).asPromise();
  const oldDb = oldConn.db;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const oldData = {};
  for (const coll of CMS_COLLECTIONS) {
    const docs = await oldDb.collection(coll).find({}).toArray();
    oldData[coll] = docs;
    const backupPath = path.join(BACKUP_DIR, `${coll}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(docs, null, 2));
    ok(`Backed up ${docs.length} documents from "${coll}" → ${backupPath}`);
  }

  await oldConn.close();
  ok('Old database connection closed.\n');

  // ── Step 2: Connect to NEW database ─────────────────────────────────────
  log('Step 2: Connecting to NEW database (cms_db)...');
  const newConn = await mongoose.createConnection(NEW_URI).asPromise();
  const newDb = newConn.db;
  ok('Connected to new database!\n');

  // Check if new DB already has data
  const existingUsers = await newDb.collection('users').countDocuments();
  if (existingUsers > 0) {
    warn(`New database already has ${existingUsers} users. Clearing CMS collections to do a fresh seed...`);
    for (const coll of CMS_COLLECTIONS) {
      await newDb.collection(coll).deleteMany({});
    }
    ok('Cleared existing CMS collections in new database.');
  }

  // ── Step 3: Copy users with PRESERVED _id values ───────────────────────
  log('Step 3: Copying users to new database...');
  if (oldData.users.length > 0) {
    // Remove any TTL-prone fields and ensure clean state
    const cleanUsers = oldData.users.map(u => {
      const clean = { ...u };
      // Reset refresh tokens so no stale tokens exist
      clean.refreshTokens = [];
      return clean;
    });
    await newDb.collection('users').insertMany(cleanUsers);
    ok(`Copied ${cleanUsers.length} users.`);
  }

  // ── Step 4: Copy departments ───────────────────────────────────────────
  log('Step 4: Copying departments to new database...');
  if (oldData.departments.length > 0) {
    await newDb.collection('departments').insertMany(oldData.departments);
    ok(`Copied ${oldData.departments.length} departments.`);
  }

  // ── Step 5: Copy existing complaints ───────────────────────────────────
  log('Step 5: Copying existing complaints to new database...');
  if (oldData.complaints.length > 0) {
    await newDb.collection('complaints').insertMany(oldData.complaints);
    ok(`Copied ${oldData.complaints.length} existing complaints.`);
  }

  // ── Step 6: Copy feedbacks ─────────────────────────────────────────────
  log('Step 6: Copying feedbacks to new database...');
  if (oldData.feedbacks.length > 0) {
    await newDb.collection('feedbacks').insertMany(oldData.feedbacks);
    ok(`Copied ${oldData.feedbacks.length} feedbacks.`);
  }

  // ── Step 7: Generate new complaint data ────────────────────────────────
  log('\nStep 7: Generating realistic complaint data for the past 4 months...');

  // Find the seed user (Shubham Somwanshi - user role)
  const seedUser = oldData.users.find(u => u.email === SEED_USER_EMAIL);
  if (!seedUser) {
    err(`Seed user ${SEED_USER_EMAIL} not found in the database!`);
    await newConn.close();
    process.exit(1);
  }
  ok(`Using seed user: ${seedUser.name} (${seedUser.email})`);

  // Find the master admin for status updates
  const masterAdmin = oldData.users.find(u => u.role === 'master_admin');

  // Department map: name → { _id, categories, subAdmins }
  const deptMap = {};
  for (const dept of oldData.departments) {
    deptMap[dept.name] = {
      _id: dept._id,
      categories: dept.categories || [],
      subAdmins: dept.subAdmins || [],
    };
  }

  const now = new Date();
  const fourMonthsAgo = new Date(now);
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

  const newComplaints = [];
  const newFeedbacks = [];
  let complaintCount = 0;

  // Generate complaints spread across departments
  for (const [deptName, categories] of Object.entries(COMPLAINT_TEMPLATES)) {
    const dept = deptMap[deptName];
    if (!dept) {
      warn(`Department "${deptName}" not found in database, skipping.`);
      continue;
    }

    for (const [category, templates] of Object.entries(categories)) {
      for (const template of templates) {
        // Create 1-2 instances of each template at different times
        const instanceCount = randomInt(1, 2);

        for (let i = 0; i < instanceCount; i++) {
          const createdAt = randomDate(fourMonthsAgo, now);
          const isAnonymous = Math.random() < 0.15; // 15% anonymous
          const studentName = randomPick(STUDENT_NAMES);

          // Determine status based on age
          const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
          let status, resolvedAt, statusHistory;

          if (ageInDays > 30) {
            // Older complaints: 70% resolved, 15% rejected, 15% processing
            const roll = Math.random();
            if (roll < 0.70) {
              status = 'resolved';
              const resolutionDays = randomInt(1, 14);
              resolvedAt = addDays(createdAt, resolutionDays);
              if (resolvedAt > now) resolvedAt = addHours(now, -randomInt(1, 48));
            } else if (roll < 0.85) {
              status = 'rejected';
            } else {
              status = 'processing';
            }
          } else if (ageInDays > 7) {
            // Mid-age: 50% resolved, 10% rejected, 25% processing, 15% pending
            const roll = Math.random();
            if (roll < 0.50) {
              status = 'resolved';
              const resolutionDays = randomInt(1, 7);
              resolvedAt = addDays(createdAt, resolutionDays);
              if (resolvedAt > now) resolvedAt = addHours(now, -randomInt(1, 24));
            } else if (roll < 0.60) {
              status = 'rejected';
            } else if (roll < 0.85) {
              status = 'processing';
            } else {
              status = 'pending';
            }
          } else {
            // Recent: 20% resolved, 30% processing, 50% pending
            const roll = Math.random();
            if (roll < 0.20) {
              status = 'resolved';
              resolvedAt = addHours(createdAt, randomInt(4, 72));
              if (resolvedAt > now) resolvedAt = addHours(now, -2);
            } else if (roll < 0.50) {
              status = 'processing';
            } else {
              status = 'pending';
            }
          }

          // Build status history
          statusHistory = [{
            status: 'pending',
            timestamp: createdAt,
            _id: new mongoose.Types.ObjectId(),
          }];

          if (status === 'processing' || status === 'resolved' || status === 'rejected') {
            const processingTime = addHours(createdAt, randomInt(1, 48));
            statusHistory.push({
              status: 'processing',
              timestamp: processingTime > now ? addHours(createdAt, 1) : processingTime,
              updatedBy: masterAdmin ? masterAdmin._id : undefined,
              _id: new mongoose.Types.ObjectId(),
            });
          }

          if (status === 'resolved') {
            statusHistory.push({
              status: 'resolved',
              timestamp: resolvedAt,
              updatedBy: masterAdmin ? masterAdmin._id : undefined,
              _id: new mongoose.Types.ObjectId(),
            });
          }

          if (status === 'rejected') {
            const rejectTime = addHours(createdAt, randomInt(2, 72));
            statusHistory.push({
              status: 'rejected',
              timestamp: rejectTime > now ? addHours(createdAt, 2) : rejectTime,
              updatedBy: masterAdmin ? masterAdmin._id : undefined,
              notes: randomPick([
                'Duplicate complaint',
                'Not within department scope',
                'Insufficient information provided',
                'Already addressed',
              ]),
              _id: new mongoose.Types.ObjectId(),
            });
          }

          // Priority based on urgency
          let priority;
          if (template.urgency === 'high') priority = randomInt(7, 10);
          else if (template.urgency === 'medium') priority = randomInt(4, 6);
          else priority = randomInt(1, 3);

          const complaintId = new mongoose.Types.ObjectId();

          const complaint = {
            _id: complaintId,
            title: template.title + (i > 0 ? ` (${randomPick(['Follow-up', 'Update needed', 'Still unresolved', 'Recurring issue'])})` : ''),
            description: template.description,
            department: dept._id,
            category: category,
            urgency: template.urgency,
            status: status,
            isAnonymous: isAnonymous,
            userId: seedUser._id,
            userName: isAnonymous ? 'Anonymous User' : studentName,
            userEmail: isAnonymous ? 'anonymous@system.local' : seedUser.email,
            assignedTo: dept.subAdmins.length > 0 ? dept.subAdmins[0] : undefined,
            priority: priority,
            tags: [],
            escalationEmailSentAt: null,
            attachments: [],
            statusHistory: statusHistory,
            internalNotes: [],
            createdAt: createdAt,
            updatedAt: resolvedAt || addHours(createdAt, randomInt(1, 24)),
            resolvedAt: resolvedAt || undefined,
            __v: statusHistory.length - 1,
          };

          newComplaints.push(complaint);
          complaintCount++;

          // Generate feedback for some resolved complaints
          if (status === 'resolved' && Math.random() < 0.4) {
            const rating = randomInt(1, 5);
            const feedbackNotes = [
              'Issue was resolved quickly. Thank you!',
              'Good response but took longer than expected.',
              'The issue was partially fixed. Some problems remain.',
              'Excellent support! The team was very responsive.',
              'Not satisfied with the resolution. The problem came back.',
              'Average service. Could have been faster.',
              'Very happy with how this was handled. Great work!',
              'The fix was temporary. Need a permanent solution.',
              'Prompt response and effective solution. Appreciate the effort.',
              'Issue resolved but communication could have been better.',
            ];

            let sentimentCategory;
            if (rating >= 4) sentimentCategory = 'Positive';
            else if (rating === 3) sentimentCategory = 'Neutral';
            else sentimentCategory = 'Negative';

            newFeedbacks.push({
              _id: new mongoose.Types.ObjectId(),
              complaint: complaintId,
              department: dept._id,
              user: seedUser._id,
              rating: rating,
              note: randomPick(feedbackNotes),
              sentiment: {
                score: rating >= 4 ? randomInt(2, 5) : rating <= 2 ? randomInt(-5, -1) : 0,
                category: sentimentCategory,
                confidence: Math.round(Math.random() * 0.5 + 0.5, 2),
              },
              isVisible: true,
              createdAt: addHours(resolvedAt, randomInt(1, 48)),
              updatedAt: addHours(resolvedAt, randomInt(1, 48)),
              __v: 0,
            });
          }
        }
      }
    }
  }

  ok(`Generated ${newComplaints.length} new complaints and ${newFeedbacks.length} new feedbacks.`);

  // ── Step 8: Insert new complaints and feedbacks ────────────────────────
  log('\nStep 8: Inserting generated data into new database...');
  if (newComplaints.length > 0) {
    await newDb.collection('complaints').insertMany(newComplaints);
    ok(`Inserted ${newComplaints.length} new complaints.`);
  }
  if (newFeedbacks.length > 0) {
    await newDb.collection('feedbacks').insertMany(newFeedbacks);
    ok(`Inserted ${newFeedbacks.length} new feedbacks.`);
  }

  // ── Step 9: Recreate indexes ───────────────────────────────────────────
  log('\nStep 9: Creating indexes...');
  const usersCol = newDb.collection('users');
  await usersCol.createIndex({ email: 1 }, { unique: true });
  await usersCol.createIndex({ role: 1 });
  await usersCol.createIndex({ department: 1 });
  await usersCol.createIndex({ isActive: 1 });
  ok('Users indexes created (NO TTL index!).');

  const complaintsCol = newDb.collection('complaints');
  await complaintsCol.createIndex({ userId: 1 });
  await complaintsCol.createIndex({ status: 1 });
  await complaintsCol.createIndex({ department: 1 });
  await complaintsCol.createIndex({ urgency: 1 });
  await complaintsCol.createIndex({ assignedTo: 1 });
  await complaintsCol.createIndex({ createdAt: -1 });
  await complaintsCol.createIndex({ status: 1, department: 1 });
  await complaintsCol.createIndex({ status: 1, urgency: 1 });
  await complaintsCol.createIndex({ priority: 1 });
  await complaintsCol.createIndex({ department: 1, status: 1, createdAt: -1 });
  ok('Complaints indexes created.');

  const feedbacksCol = newDb.collection('feedbacks');
  await feedbacksCol.createIndex({ complaint: 1 });
  await feedbacksCol.createIndex({ department: 1 });
  await feedbacksCol.createIndex({ user: 1 });
  await feedbacksCol.createIndex({ rating: 1 });
  await feedbacksCol.createIndex({ 'sentiment.category': 1 });
  await feedbacksCol.createIndex({ createdAt: -1 });
  await feedbacksCol.createIndex({ complaint: 1, user: 1 });
  await feedbacksCol.createIndex({ department: 1, createdAt: -1 });
  ok('Feedbacks indexes created.');

  // ── Step 10: Verify ────────────────────────────────────────────────────
  log('\nStep 10: Verifying migration...');
  const finalCounts = {};
  for (const coll of CMS_COLLECTIONS) {
    finalCounts[coll] = await newDb.collection(coll).countDocuments();
  }

  console.log('\n┌───────────────────────────┬────────┬────────┐');
  console.log('│ Collection                │ Old DB │ New DB │');
  console.log('├───────────────────────────┼────────┼────────┤');
  for (const coll of CMS_COLLECTIONS) {
    const oldCount = String(oldData[coll].length).padStart(6);
    const newCount = String(finalCounts[coll]).padStart(6);
    console.log(`│ ${coll.padEnd(25)} │${oldCount} │${newCount} │`);
  }
  console.log('└───────────────────────────┴────────┴────────┘');

  // Verify no TTL indexes on users
  const newIndexes = await newDb.collection('users').indexes();
  const ttlCheck = newIndexes.find(i => i.expireAfterSeconds !== undefined);
  if (ttlCheck) {
    err('WARNING: TTL index found on users collection in new database! Dropping it...');
    await newDb.collection('users').dropIndex(ttlCheck.name);
  } else {
    ok('No TTL indexes on users collection — safe! ✅');
  }

  await newConn.close();

  console.log(`\n\x1b[32m${'═'.repeat(60)}\x1b[0m`);
  console.log(`\x1b[32m  Migration complete! 🎉\x1b[0m`);
  console.log(`\x1b[32m  Backup saved to: ${BACKUP_DIR}\x1b[0m`);
  console.log(`\x1b[32m  New DB: cms_db on cluster0.lfrm72s.mongodb.net\x1b[0m`);
  console.log(`\x1b[32m${'═'.repeat(60)}\x1b[0m\n`);

  process.exit(0);
}

main().catch(e => {
  err(`Migration failed: ${e.message}`);
  console.error(e);
  process.exit(1);
});
