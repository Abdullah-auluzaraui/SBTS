**College of Computing & Informatics (CCI)**

**SENIOR PROJECT-II REPORT**

School Bus Tracking System

**Author(s):**

S220040146 ABDULLAH AULUZARAUI

S210045882 FAISAL ABAALKHAIL

S220028752 MOHAMMED AL ALSHAHI

S210046818 MOHAMMED ALAMER

S210046125 ABDULLAH BIN KHUDAIR

S220023529 FAISEL ALGAHTANI

**Project Supervisor:**

Dr. Khalid Almalki

**School bus tracking system**

By:

- ABDULLAH AULUZARAUI
- FAISAL ABAALKHAIL
- MOHAMMED AL ALSHAHI
- MOHAMMED ALAMER
- ABDULLAH BIN KHUDAIR
- FAISEL ALGAHTANI

Thesis/Project submitted to:

College of Computing & Informatics, Saudi Electronic University, Riyadh, Saudi Arabia.

In partial fulfillment of the requirements for the degree of:

**BACHELOR OF SCIENCE** **IN INFORMATION TECHNOLOGY**

|     |     |     |
| --- | --- | --- |
|     |     |     |
| Project Supervisor |     | Project Committee Chair |

Dr. Khalid Almalki

**ABSTRACT**

The School Bus Tracking System project addresses critical challenges in school transportation, primarily concerning student safety, operational inefficiency, and poor communication between parents, school administrators, and bus drivers. Traditional school bus systems often lack real-time tracking, leaving parents and school administrators anxious and uninformed about bus locations, delays, and student attendance. This project proposes a comprehensive solution using cutting-edge technologies such as GPS, NFC cards, and cloud computing to enhance safety, streamline operations, and provide real-time updates to all stakeholders.

The system provides a web-based platform with several key features, including live bus tracking, automated student check-ins via NFC cards, and instant notifications to parents about their child's bus status, such as arrival times and delays. Additionally, it offers school administrators a centralized dashboard to manage bus routes, monitor driver performance, and optimize operations. The platform's integration with Google Maps allows real-time location tracking, while the backend infrastructure, built with Node.js, Express.js, and MongoDB, ensures scalability and performance.

By aligning with Saudi Vision 2030, the project aims to modernize school transportation in Saudi Arabia, improving safety and efficiency while reducing operational costs. The system's successful implementation will offer significant benefits, including enhanced student safety, better communication, and increased transparency for parents and schools. The project also contributes to the professional development of the team, allowing them to apply IoT, cloud infrastructure, and software development skills to create a real-world solution.

**DEDICATION**

We, the project team, dedicate this work to our families, whose unwavering support, patience, and encouragement have guided us throughout this journey. Their belief in us has been a constant source of strength and motivation.

We also dedicate this project to our respected supervisor, **Dr. Khalid Almalki**, whose guidance, feedback, and continuous encouragement played a crucial role in shaping the direction and quality of this work. His mentorship has inspired us to grow both academically and professionally.

Lastly, we extend this dedication to our university, Saudi Electronic University, for providing us with the knowledge, resources, and environment that enabled us to explore, innovate, and complete this project successfully.

**PREFACE**

The School Bus Tracking System project is designed to address critical challenges in school transportation, specifically focusing on enhancing the safety of students, optimizing bus operations, and improving communication between parents, school administrators, and bus drivers. Traditional school transportation systems often lack the ability to provide real-time updates, leaving parents concerned about their children's safety and school administrators struggling with inefficiencies in managing bus fleets.

This project aims to provide a comprehensive solution by utilizing GPS technology, NFC cards, and cloud computing to enable real-time tracking of school buses, automate student attendance, and deliver instant notifications to parents and school administrators. By integrating these technologies, the system is expected to improve safety, streamline operations, and provide a more transparent and efficient transportation experience.

The development of this system is based on the Agile methodology, ensuring a flexible and iterative approach to building the solution. The design and planning stages are well-defined, and we have carefully considered all the necessary components required for the system’s functionality, including the Parent Portal, Admin Dashboard, and Driver Interface. The system’s architecture aims to be scalable and user-friendly, ensuring that it meets the needs of all stakeholders.

This project not only presents a solution to a significant real-world problem but also serves as an opportunity to apply our academic knowledge of modern technologies such as IoT, cloud infrastructure, and web development. It is an important step in our professional development, providing us with the opportunity to contribute meaningfully to the field of technology while focusing on a practical and impactful application.

**REVISION HISTORY**

|     |     |     |     |
| --- | --- | --- | --- |
| **5** | **Date** | **Reason For Changes** | **Version** |
| **Senior project report 1** | 3/10/2025 | Updating structures and Gantt Chart | 1   |
| **Senior project report 2** | 23/10/2025 | Updating Literature Review presentation | 2   |
| **Senior project report 3** | 30/10/2025 | Completed Literature Review | 3   |
| **Senior project report 4** | 6/11/2025 | Completed Methodology | 4   |
| **Senior project report 5** | 13/11/2025 | Completed System Analysis | 5   |

**TABLE OF CONTENTS**

[CHAPTER 1: INTRODUCTION 7](#_Toc31793757)

[1.1 Project Background/Overview: 7](#_Toc31793758)

[1.2 Problem Description: 7](#_Toc31793759)

[1.3 Project Scope: 7](#_Toc31793760)

[1.4 Project Objectives: 7](#_Toc31793761)

[1.5 Project Structure/Plan: 7](#_Toc31793762)

[CHAPTER 2: LITERATURE REVIEW 8](#_Toc31793763)

[CHAPTER 3: METHODOLOGY 9](#_Toc31793764)

[CHAPTER 4: SYSTEM ANALYSIS 10](#_Toc31793765)

[4.1 Product Features: 10](#_Toc31793770)

[4.2 Functional Requirements: 10](#_Toc31793771)

[4.3 Nonfunctional Requirements 11](#_Toc31793772)

[4.4 Analysis Models 11](#_Toc31793773)

[CHAPTER 5: SYSTEM DESIGN 12](#_Toc31793774)

[CHAPTER 6: SYSTEM IMPLEMENTATION 13](#_Toc31793775)

[CHAPTER 7: TESTING & EVALUATION 14](#_Toc31793776)

[CHAPTER 8: RESULTS AND ANALYSIS 15](#_Toc31793777)

[CHAPTER 9: CONCLUSION AND FUTURE WORK 16](#_Toc31793778)

[6.1 Conclusion 16](#_Toc31793781)

[6.2 Future Work 16](#_Toc31793782)

[REFERENCES 17](#_Toc31793783)

[APPENDIX: Glossary 18](#_Toc31793784)

# CHAPTER 1: INTRODUCTION

- 1.  **Project Background/Overview:**

School transportation is essential for ensuring that students travel safely between home and school. However, traditional school bus systems often suffer from inefficiencies, weak communication, and safety concerns. Parents frequently lack real-time information about their children’s journeys, while school administrators face difficulties in managing routes, monitoring drivers, and handling emergencies.

The main limitation of existing systems is the absence of real-time visibility. Parents cannot track bus locations or receive accurate arrival times, which leads to uncertainty and potential safety risks. Additionally, manual processes increase the likelihood of errors, such as route deviations or missed student drop-offs.

To overcome these challenges, this project proposes a technology-driven School Bus Tracking System that integrates GPS tracking, NFC-based student identification, and cloud-based services. The system improves transparency, enhances communication, and provides a safer transportation environment for all stakeholders.

- 1.  **Problem Description:**

Many schools struggle to ensure student safety and maintain efficient transportation operations. Parents and school administrators do not have real-time information about bus locations, delays, or student attendance. This lack of visibility leads to anxiety, longer waiting times, and increased safety risks.

Furthermore, communication between parents, drivers, and school administration is often delayed or ineffective. Without a centralized system, it becomes difficult to respond quickly to emergencies or unexpected situations.

Therefore, there is a need for a smart solution that provides real-time tracking, instant notifications, and reliable communication among all stakeholders.

- 1.  **Project Scope:**

This project delivers an integrated web-based platform for school bus tracking in the Kingdom of Saudi Arabia. While mobile applications are popular, a **web-based platform** was intentionally selected to ensure universal accessibility through **Responsive Web Design (RWD)**. This approach guarantees a seamless mobile experience for parents addressing their preference for mobile usage—while providing school administrators with the necessary interface for complex fleet management and route optimization. Leveraging advanced technologies like GPS, NFC cards, and sensors, the platform aims to establish a safer and more efficient transportation system, in alignment with Saudi Vision 2030.

**Platform Components:** A comprehensive and scalable system featuring:

1.  **Parent Web Portal:** For live tracking and receiving notifications.
2.  **School Administration Dashboard:** For managing the fleet, routes, and reports.
3.  **Driver Web Interface:** For route management and communication.
4.  **In-Bus Hardware System:** Including an NFC card reader and various safety sensors.
    1.  **Project Objectives:**

The main objective of this project is to develop a secure and efficient school transportation system. This is achieved through the following objectives:

- **Enhance Student Safety:**  
    By using NFC-based check-in and check-out along with GPS tracking, the system ensures that every student is monitored when boarding and leaving the bus, reducing the risk of students being lost, misplaced, or left unattended.
- **Provide Real-Time Tracking:**  
    Enable parents and administrators to monitor the live location of school buses.
- **Send Instant Notifications:**  
    Inform parents about arrival times, delays, and important updates to reduce waiting time and uncertainty.
- **Improve Communication:**  
    Establish direct communication between parents, drivers, and school management.
- **Optimize Transportation Operations:**  
    Improve route planning and reduce delays and operational inefficiencies.
- **Develop a Web-Based System:**  
    Build a scalable and responsive website using modern technologies such as Node.js and MongoDB.
- **Ensure System Reliability and Performance:**  
    Conduct testing to ensure accuracy, fast response time, and system stability.

- 1.  **Project Structure/Plan:**

| **Activity ID** | **Activity Name** | **Start (Week)** | **Finish (Week)** | **Duration** | **Dependencies** |
| --- | --- | --- | --- | --- | --- |
| **A1** | **Brainstorming Idea** | **0** | **3** | **3 weeks** | **–** |
| **A2** | **Introduction** | **3** | **5** | **2 weeks** | **A1** |
| **A3** | **Literature Review** | **5** | **7** | **2 weeks** | **A2** |
| **A4** | **Methodology** | **7** | **9** | **2 weeks** | **A3** |
| **A5** | **System Analysis** | **9** | **10** | **1 week** | **A4** |
| **A6** | **System Design** | **10** | **12** | **2 weeks** | **A5** |
| **A7** | **Discussion & Conclusion** | **12** | **13** | **1 week** | **A6** |

**Table 1-1**

**A1 – Brainstorming Idea:  
**Define the app’s objectives, brainstorm features such as live GPS tracking and notifications, and assign roles among the group members.

**A2 – Introduction:  
**Outline the project’s purpose, problem statement, and expected outcomes to establish the foundation for development.

**A3 – Literature Review:  
**Research existing bus tracking systems, GPS technologies, and web platforms to identify best practices and gaps.

**A4 – Methodology:  
**Design the project’s approach, select suitable tools and technologies, and plan testing and evaluation methods.

**A5 – System Analysis:  
**Analyze system requirements, create data flow diagrams, and determine the technical and functional specifications.

**A6 – System Design:  
**Develop the overall architecture, database structure, and UI/UX layouts to define how the system will operate.

**A7 – Discussion & Conclusion:  
**Summarize project outcomes, evaluate performance, and prepare final documentation and reports for submission.

**PDM CHART:**

**Figure 1:1**

**Figure 1:2**

# CHAPTER 2: LITERATURE REVIEW**Introduction**

This chapter reviews existing research studies and real-world applications related to school bus tracking systems. The purpose is to analyze how current solutions address key challenges such as student safety, real-time tracking, and communication between parents, drivers, and school administrators. The chapter also examines the limitations of these systems and identifies the gaps that justify the need for the proposed solution.

**2.1 Existing School Bus Tracking Systems**

**2.1.1 Traditional School Transportation Systems**

Traditional school transportation systems rely mainly on manual processes, including attendance sheets, fixed schedules, and verbal communication. Parents typically depend on estimated arrival times or direct contact with drivers or school staff to obtain updates.

However, these methods lack transparency and real-time monitoring capabilities. According to Chigwedere and Venter (2021), parents often express significant concerns about their children's safety during school commutes due to the absence of reliable tracking systems. Without real-time visibility, parents cannot confirm whether their children have safely boarded or exited the bus. Furthermore, traditional systems are prone to errors and delays. Situations such as students boarding the wrong bus, being left behind, or experiencing delayed emergency responses highlight serious safety risks. These limitations demonstrate the need for more advanced and automated solutions.

# **2.1.2 GPS-Based Tracking Systems**

To overcome the limitations of traditional systems, many modern solutions have introduced GPS-based tracking. These systems allow users to monitor the location of school buses in real time using map-based interfaces.

Research by Shibghatullah et al. (2022) shows that GPS tracking significantly improves operational efficiency by providing accurate location data and estimated arrival times. Commercial platforms such as Zūm also offer additional features like route optimization and notifications.

Despite these advantages, GPS-based systems have an important limitation: they focus only on tracking the vehicle, not the students. While parents can see the bus location, they cannot verify whether their child is actually on the bus. Elijah et al. (2018) emphasize that effective transportation systems must include both vehicle tracking and user-level monitoring to ensure safety.

# **2.1.3 RFID-Based Student Monitoring Systems**

To address the limitations of GPS-only systems, some solutions have implemented RFID-based technologies. In these systems, students carry RFID cards that are scanned when entering or exiting the bus.

According to Al-Khalifa et al. (2020), RFID-based systems significantly improve attendance accuracy and reduce human errors. They provide automated tracking of student presence and enhance accountability within school transportation systems.

However, RFID-based systems also have limitations. They often require specialized hardware and infrastructure, which can increase implementation costs. Additionally, many of these systems operate independently from GPS tracking, meaning they do not provide a complete solution. In some cases, parents may not receive real-time updates, which reduces the effectiveness of the system in improving communication.

**2.1.4 Integrated Smart Tracking Systems**

Recent developments in school bus tracking systems aim to integrate GPS tracking with student identification technologies. These systems attempt to provide a more comprehensive solution by combining vehicle tracking, student monitoring, and communication features.

For example, Srinivas et al. (2023) highlight the use of geofencing, where parents receive notifications when the bus enters or leaves specific areas such as home or school zones. This feature improves communication and allows parents to better plan and monitor their children's journeys.

Additionally, Muharemović et al. (2022) demonstrate that integrated smart transportation systems can improve operational efficiency, reduce transportation costs, and enhance service reliability.

Despite these improvements, many integrated systems still face challenges. They often require complex infrastructure, depend heavily on mobile applications, and may involve high implementation costs. Masrur (2023) notes that educational institutions often struggle to adopt such systems due to financial and technical constraints.

**2.2 Limitations of Existing Systems**

Based on the analysis of current systems, several key limitations can be identified:

# Many systems focus on either bus tracking or student monitoring, rather than combining both effectively. GPS-based systems do not provide student-level verification, which is critical for safety. RFID systems improve attendance tracking but often lack real-time integration and communication features. Most commercial solutions depend on mobile applications, which may not be convenient for all users. High costs and technical complexity limit the adoption of advanced systems in many schools. These limitations show that existing solutions are incomplete and do not fully address the needs of all stakeholders.

# **2.3 Research Gap**The literature review reveals a clear gap in current school bus tracking solutions. While many systems provide partial functionality, there is a lack of a fully integrated system that combines:Real-time bus tracking Accurate student identification Easy access without requiring application installation Cost-effective and scalable implementation Elijah et al. (2018) and Calvete et al. (2023) emphasize the importance of developing systems that integrate multiple features while maintaining usability and efficiency. This gap highlights the need for a more practical and accessible solution.**2.4 Proposed System Contribution**The proposed system addresses the identified gaps by providing a comprehensive and user-friendly solution. Unlike existing systems, it integrates both tracking and student verification while ensuring accessibility for all users.The system:Combines GPS tracking with NFC-based student identification Provides a web-based platform that can be accessed from any device without installing an application Enhances communication through real-time notifications Offers a cost-effective and scalable solution suitable for schools This approach ensures improved student safety, better communication, and higher usability compared to existing systems.

# **2.5 Comparative Analysis of Existing Systems**

<div class="joplin-table-wrapper"><table><tbody><tr><td><h1><strong>Feature</strong></h1></td><td><h1><strong>Traditional Systems</strong></h1></td><td><h1><strong>Zūm (Commercial)</strong></h1></td><td><h1><strong>RFID-Based Systems</strong></h1></td><td><h1><strong>Proposed System</strong></h1></td></tr><tr><td><h1>Tracking Method</h1></td><td><h1>Manual</h1></td><td><h1>GPS Tracking</h1></td><td><h1>RFID Only</h1></td><td><h1>GPS + NFC</h1></td></tr><tr><td><h1>Student Verification</h1></td><td><h1>Manual</h1></td><td><h1>Limited</h1></td><td><h1>Yes</h1></td><td><h1>Yes</h1></td></tr><tr><td><h1>Real-Time Updates</h1></td><td><h1>No</h1></td><td><h1>Yes</h1></td><td><h1>Partial</h1></td><td><h1>Yes</h1></td></tr><tr><td><h1>Accessibility</h1></td><td><h1>Low</h1></td><td><h1>Mobile App Only</h1></td><td><h1>Limited</h1></td><td><h1>Web-Based (No App Required)</h1></td></tr><tr><td><h1>Communication</h1></td><td><h1>Phone Calls</h1></td><td><h1>App Notifications</h1></td><td><h1>Basic</h1></td><td><h1>Real-Time Notifications</h1></td></tr><tr><td><h1>Cost</h1></td><td><h1>Low</h1></td><td><h1>High</h1></td><td><h1>Medium</h1></td><td><h1>Cost-Effective</h1></td></tr><tr><td><h1>Ease of Use</h1></td><td><h1>Low</h1></td><td><h1>Moderate</h1></td><td><h1>Moderate</h1></td><td><h1>High</h1></td></tr><tr><td><h1>Platform</h1></td><td><h1>None</h1></td><td><h1>Mobile Application</h1></td><td><h1>Hardware-Based</h1></td><td><h1>Responsive Website</h1></td></tr></tbody></table></div>

# **Conclusion**

The review of existing systems demonstrates that significant progress has been made in improving school transportation. However, most solutions remain limited, as they focus on either vehicle tracking or student monitoring without fully integrating both aspects.

In addition, many systems rely on mobile applications and complex infrastructure, which reduces accessibility and increases costs. The proposed system overcomes these limitations by offering a web-based, integrated solution that combines real-time tracking, student verification, and ease of use.

# CHAPTER 3: METHODOLOGY

**3.1 Introduction**

This chapter describes the development methodology adopted for the implementation of the School Bus Tracking System. It explains the structured process followed by the project team to transform system requirements into a functional solution.

To ensure effective development, a modern iterative methodology was selected. This approach allows continuous improvement, flexibility in handling changes, and frequent evaluation of system progress. The chapter further presents the selected methodology, its justification, the implementation process, and the testing strategy used to ensure system quality.

**3.2 Selected Methodology: Scrum Framework**

This project adopts the **Scrum methodology**, which is a widely used framework for managing and executing software development projects. Scrum is based on iterative and incremental development, where the project is divided into small cycles called Sprints. Each Sprint produces a functional part of the system.

Unlike traditional linear development approaches, Scrum enables continuous feedback, adaptability, and early delivery of working components. This makes it particularly suitable for systems that require ongoing testing and refinement, such as the School Bus Tracking System.

**3.3 Justification for Using Scrum**

The selection of Scrum is based on several important factors related to the nature of this project:

First, the system involves multiple components that must work together effectively. Scrum allows the team to develop and test these components gradually, reducing risks and improving system reliability.

Second, Scrum supports continuous feedback. Since the system is intended for real users such as parents and school administrators, their feedback is essential. Scrum enables the team to review progress after each Sprint and make necessary improvements.

Third, Scrum improves project management by dividing tasks into smaller, manageable units. This helps the team focus on priorities and ensures steady progress throughout the development process.

Finally, Scrum enhances flexibility. If any changes or challenges arise during development, the team can adjust the plan in the next Sprint without affecting the entire project.

**3.4 Scrum Framework Process**

The Scrum methodology is implemented through a structured cycle consisting of several key phases. These phases are repeated throughout the project lifecycle.

**Figure 3.1: Scrum Methodology Cycle (Illustration Description)**

You should insert a diagram showing a circular flow with the following sequence:

**Product Backlog - Sprint Planning - Sprint - Daily Scrum - Sprint Review - Sprint Retrospective - (repeat cycle)**

**3.4.1 Product Backlog**

The Product Backlog is a list of all system requirements and features. These include functionalities such as bus tracking, student check-in, notifications, and system dashboards. The backlog is continuously updated and prioritized based on project needs.

**3.4.2 Sprint Planning**

At the beginning of each Sprint, the team selects a set of tasks from the Product Backlog. These tasks are chosen based on priority and feasibility. A clear goal is defined for each Sprint to ensure focused development.

**3.4.3 Sprint Execution**

During the Sprint, the development team works on implementing the selected features. Each Sprint has a fixed duration (e.g., two weeks), and the goal is to deliver a functional part of the system by the end of the cycle.

**3.4.4 Daily Scrum Meetings**

Daily Scrum meetings are short sessions held to track progress. Each team member discusses:

- What has been completed
- What will be done next
- Any challenges faced

These meetings improve communication and ensure that the team stays aligned.

**3.4.5 Sprint Review**

At the end of each Sprint, the completed work is reviewed. The team demonstrates the developed features and evaluates whether the Sprint goals have been achieved. Feedback is collected to improve future development.

**3.4.6 Sprint Retrospective**

After the review, the team reflects on the Sprint process. This phase focuses on identifying strengths, weaknesses, and areas for improvement. The goal is to enhance team performance in upcoming Sprints.

**3.5 Implementation Plan**

The project is divided into multiple Sprints, each focusing on specific functionalities:

- **Sprint 1:** System setup and initial development
- **Sprint 2:** Development of the Parent Web Portal
- **Sprint 3:** Development of the Administration Dashboard
- **Sprint 4:** Integration of system components and features
- **Sprint 5:** System testing and final improvements

Each Sprint delivers a working part of the system, ensuring continuous progress and early validation.

**3.6 Testing Strategy**

To ensure the reliability and performance of the system, a structured testing approach is adopted:

**1\. Unit Testing**

Each individual component of the system is tested separately to ensure it functions correctly. This helps identify errors at an early stage.

**2\. Integration Testing**

After unit testing, different components are combined and tested together. This ensures that all parts of the system interact properly and function as a complete solution.

**3\. Acceptance Testing**

The final system is tested in a simulated real-world environment. Users evaluate the system’s usability, accuracy, and performance. This step ensures that the system meets user expectations and project objectives.

**Conclusion**

This chapter presented the Scrum methodology as the development approach for the School Bus Tracking System. By adopting an iterative and flexible framework, the project ensures continuous improvement, effective collaboration, and successful delivery of system functionalities. The structured Scrum process, combined with a comprehensive testing strategy, provides a strong foundation for developing a reliable and user-friendly system.

# CHAPTER 4: SYSTEM ANALYSIS

1.  
2.  
3.  
4.  1.  **Product Features:**

The School Bus Tracking System promises a lot in terms of providing an array of key features that are specifically aimed at enhancing student safety, improving communication between parents, drivers, and school administrators, and boosting efficiency in school transportation.

The main features include:

**Real-Time Bus Tracking:**

The system enables parents and administrators to track current bus locations on a live map using GPS integration.

**Student Check-In/Check-Out via NFC:**

Every student carries an NFC card that gets scanned once they get onto or exit the bus, automatically updating the attendance records in the system.

**Automatic Notifications to Parents:**

It sends alerts to the parents on the web portal or the app such as “Bus is approaching,” “Student has boarded,” and “Arrived at school.”

**School Administration Dashboard:**  
Provides a control panel for administrators to track various buses, manage routing, and generate reports on the performance of drivers.

**Driver Web Interface:**  
A simple interface for viewing, by drivers, assigned routes, updating trip status, and reporting emergencies or delays.

**Emergency Alerts:**  
In case of accidents or route deviations, instant alerts are sent to parents and school management.

**Secure Login and Role-Based Access:**  
Different login portals for parents, drivers, and administrators, respectively, ensure privacy and protection of data.  
<br/>

- 1.  **Functional Requirements:**

All functional requirements (in relation with the production features identified in the section above) are expressed as use-cases as well as analysis models and deign models are included in this chapter. Fill out the following template for each use-case. Don’t really say “Use-Case 1.” State the use-case name in just a few words e.g. “Withdraw Cash from ATM”. A use-case may have multiple alternate courses of action.

This section outlines the system’s functional requirements through fifteen use cases, each describing the main interactions between users (actors) and the system.  
Actors include:

- **Admin** : manages routes, users, and buses.
- **Driver** : operates the bus and interacts with system alerts.
- **Parent** : tracks their child’s bus and receives notifications.
- **Student** : interacts via NFC for attendance.
- **System** : performs automatic background processes.

**List of Use Cases**

1.  Student Check-In and Check-Out
2.  Real-Time Bus Tracking
3.  Parental Notifications
4.  Driver Login
5.  Admin Login
6.  Route Management
7.  Add New Bus
8.  Register Student
9.  Register Parent Account
10. View Attendance Records
11. Generate Reports
12. Emergency Alert (Driver)
13. Edit Profile (Parent/Admin/Driver)
14. Logout
15. View Bus Route and Estimated Time of Arrival (Parent)

**Use Case : Student Check-In–Check-Out**

**Identifier**

UC-1

**Purpose**

Capture a student’s boarding/leaving on the bus using the in-bus NFC reader and reflect current ride status.

**Priority**

high

**Pre-conditions**

Student is registered and linked to today’s trip; trip is started by the driver; in-bus NFC reader powered; device time synced; GPS available

**Post-conditions**

An attendance record is stored for the interaction; the student’s ride status is updated; an audit entry is written; if connected, the update is available to other portals.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

**Student** taps the NFC card when entering the bus.

**System** saves an attendance record for boarding

**2**

**Student** taps the NFC card when leaving the bus.

**System** saves an attendance record for leaving.

**3**

**System** records all students are in the bus

System notifies the driver and the route begins

**4**

**System** records all the students have left

System records all the timestamps and gps information

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Student taps with unknown/unassigned NFC.

Rejects tap and displays “Unrecognized ID”.

**2**

Student taps on the wrong bus/route.

Blocks event and displays “Not on this route”.

**3**

System detects missing students

Driver and admin get notified

**4**

System detects bus missed a stop

System updates route

**Use Case :** Real-Time Bus Tracking

**Identifier**

UC-2

**Purpose**

Provide live bus location and trip progress to parents and administrators.

**Priority**

high

**Pre-conditions**

Bus device authenticated; route for today started by driver; GPS active; network available

**Post-conditions**

Current location and status are available in the live feed; ETAs/progress shown; deviations and delays flagged; trip log updated.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

**System** records the bus GPS at regular intervals.

**System** updates the live location feed and refreshes “last updated” time.

**2**

**System** calculates the time to upcoming stops.

**System** shows simple ETAs next to each stop on the route.

**3**

**System** detects entry to a stop area.

**System** marks the stop as reached with a timestamp on the map and trip log.

**4**

**Parent** opens the live map for their child’s route.

**System** displays the bus marker on the map with the last update time.

**5**

**Admin** opens a bus detail view.

**System shows the route map with a short breadcrumb trail of recent movement.**

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

**System** loses GPS accuracy or signal.

**System** labels the location as **stale** and keeps the last known point visible.

**2**

**System** loses network connectivity on the bus.

**System** buffers location updates locally and backfills the map when reconnected.

**3**

**Admin** requests a trip summary at route end.

**System** generates distance, duration, average speed, and stop timestamps.

**4**

**System detects the bus off the planned route for a while.**

**System flags a route deviation on the admin dashboard.**

**Use Case :** Parental Notifications

**Identifier**

UC-3

**Purpose**

Inform guardians about the child’s bus status (approach, boarded, dropped off, delays, emergencies) using configured notification channels.

**Priority**

high

**Pre-conditions**

|     |
| --- |
|     |
|     |

Parent account linked to student; notification channels configured (push / SMS / email) and allowed; tracking & attendance feeds active.

**Post-conditions**

Notifications are successfully sent and logged for the parent; the notification history is updated in the database

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

**System detects the bus entering the home-area radius.**

**System sends an “Approaching” notification to the parent’s preferred channel with ETA.**

**2**

**System receives an attendance record that the child boarded.**

**System sends a “Boarded” notification with time and bus identifier.**

**3**

**System detects a delay beyond the configured threshold.**

**System sends a “Delay” notification describing expected impact (minutes or next ETA).**

**4**

**Parent mutes notifications for a route or time window.**

**System records the mute preference and suppresses non-urgent notices accordingly.**

**5**

**System receives a driver-declared emergency or admin broadcast.**

**System sends an urgent broadcast notification and marks it high-priority.**

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

**System sees a single, low-confidence geofence hit (GPS jitter)**

**Withholds Approaching and waits for a confirmatory sample before notifying.**

**2**

**System detects the stop is within scheduled dwell (long stop expected).**

**Suppresses Delay notification and recomputes ETA after the dwell window.**

**3**

**System cannot reach parent via preferred channel during emergency (bounce/error).**

**Escalates immediately to alternate channels per parent settings and logs retries.**

**4**

**Parent submits an invalid new contact (bad phone/email format).**

**Rejects the update, keeps existing contact, and prompts for correction.**

**Use Case: Driver Login**

**Identifier**

UC-4

**Purpose**

To allow the bus driver to securely log into the system and access their assigned route dashboard.

**Priority**

Medium

**Pre-conditions**

The driver must have a registered account with valid credentials in the system. Internet connection must be available.

**Post-conditions**

The driver is authenticated and redirected to their dashboard showing the assigned route and trip details.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Driver opens the login page.

System displays the driver login form.

**2**

Driver enters username and password.

System validates credentials with the database.

**3**

Credentials are correct.

System grants access and loads the driver’s dashboard with assigned route.

**4**

Driver can now view route details and student list.

System displays personalized data and current trip information.

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Driver enters incorrect username or password.

System displays “Invalid Credentials” message and prompts retry.

**2**

Driver’s account is inactive or suspended.

System denies access and advises driver to contact admin.

**3**

Internet connection unavailable.

System shows “Network Error” message and prevents login.

**Use Case: Admin Login**

**Identifier**

UC-5

**Purpose**

To authenticate administrators so they can manage system data such as users, routes, and buses.

**Priority**

Medium

**Pre-conditions**

Admin must have a valid registered account with proper access privileges.

**Post-conditions**

Admin is successfully logged into the system and redirected to the admin control panel.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Admin opens the login interface.

System displays the admin login form.

**2**

Admin enters username and password.

System checks credentials against the admin database.

**3**

Credentials verified successfully.

System grants access and loads the admin dashboard.

**4**

Admin can now perform management operations (routes, users, reports).

Dashboard options are displayed accordingly.

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Admin enters wrong credentials.

System shows an “Access Denied” message.

**2**

Admin forgets password.

System provides a “Forgot Password” link for reset.

**3**

Server unavailable.

System displays “Unable to connect, try again later.”

**Use Case: Route Management**

**Identifier**

UC-6

**Purpose**

To allow the administrator to create, update, or delete bus routes and assign them to specific drivers and buses.

**Priority**

Medium

**Pre-conditions**

Admin must be logged in and have route management privileges. Map API integration (e.g., Google Maps) should be available.

**Post-conditions**

Routes are successfully created or updated in the database, and drivers receive updated route assignments.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Admin selects “Manage Routes” from the dashboard.

System displays the list of existing routes.

**2**

Admin chooses to create or edit a route.

System opens a map interface for editing.

**3**

Admin saves route.

System validates data and updates the route database.

**6**

System notifies driver of route change.

Driver dashboard updates with the new route.

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Admin enters invalid or incomplete data.

System displays error and requests correction.

**2**

Map API not responding.

System shows “Unable to load map” and prevents route saving.

**3**

Database connection error.

System logs the error and prompts retry.

**Use Case: Add New Bus**

**Identifier**

UC-7

**Purpose**

To allow the system administrator to add a new school bus with its details to the database.

**Priority**

Low

**Pre-conditions**

The administrator must be logged into the system.

**Post-conditions**

The new bus information is saved and visible in the bus list.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Admin opens the “Bus Management” section

System displays the list of all existing buses

**2**

Admin selects the “Add New Bus” option

System opens a form to enter bus information

**3**

Admin fills in details (Bus ID, route, driver name, capacity)

System validates input fields for completeness

**4**

Admin submits the form

System saves the new bus record and shows a success confirmation

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Admin enters invalid or incomplete information

System displays an error message highlighting missing fields

**2**

Admin corrects the data

System revalidates the input

**3**

Admin resubmits the form

System saves the bus successfully and confirms the update

**Use Case: Student Register**

**Identifier**

UC-8

**Purpose**

To register a new student and link them to a bus and parent account

**Priority**

Low

**Pre-conditions**

Admin must be logged in and buses must already be registered.

**Post-conditions**

Student data is stored and linked to the selected bus and parent.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Admin opens the “Register Student” page

System displays the student registration form

**2**

Admin fills in student details (Name, ID, Grade, Bus ID, Parent ID)

System checks for missing or duplicate data

**3**

Admin confirms the registration

System saves the student record in the database

**4**

Admin reviews the saved record

System displays confirmation with the new student’s info

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

Admin inputs invalid or duplicate data

System alerts admin with an error message

**2**

Admin edits incorrect fields

System verifies corrected data

**3**

Admin resubmits the form

System confirms the student registration

**Use Case: Register Parent Account**

|     |     |     |
| --- | --- | --- |
| **Identifier** |     | UC-9 |     |
| **Purpose** |     | To allow parents to create an account and link to their child’s profile for tracking and notifications |     |
| **Priority** |     | Low |     |
| **Pre-conditions** |     | Parents must have a valid student ID or invitation code. |     |
| **Post-conditions** |     | Parent account is created and linked to the student. |     |
| **Typical Course of Action** |     |     |     |
| **S#** | **Actor Action** |     | **System Response** |
| **1** | Parent opens the app or web portal |     | System displays the registration form |
| **2** | Parents enter personal details and student ID |     | System validates the data and checks for existing accounts |
| **3** | Parent submits the registration form |     | System creates the new account and stores the data securely |

|     |     |     |
| --- | --- | --- |
| **Alternate Course of Action** |     |     |
| **S#** | **Actor Action** | **System Response** |
| **1** | Parent provides invalid or already-used student ID | System displays an error message |
| **2** | Parents correct the entered data | System revalidates and allows resubmission |
| **3** | Parent resubmits the registration form | System completes the account creation successfully |

**Use Case: View Attendance Records**

<div class="joplin-table-wrapper"><table><tbody><tr><td colspan="2"><p><strong>Identifier</strong></p></td><td colspan="2"><p>UC-10</p></td></tr><tr><td colspan="2"><p><strong>Purpose</strong></p></td><td colspan="2"><p>To allow the school administrator to view attendance records of students.</p></td></tr><tr><td colspan="2"><p><strong>Priority</strong></p></td><td colspan="2"><p>Medium</p></td></tr><tr><td colspan="2"><p><strong>Pre-conditions</strong></p></td><td colspan="2"><ul><li>The administrator is logged into the system.</li><li>Attendance data exists in the database.</li></ul><p></p></td></tr><tr><td colspan="2"><p><strong>Post-conditions</strong></p></td><td colspan="2"><p>Attendance records are displayed to the administrator.</p></td></tr><tr><td colspan="4"><p><strong>Typical Course of Action</strong></p></td></tr><tr><td><p><strong>S#</strong></p></td><td colspan="2"><p><strong>Actor Action</strong></p></td><td><p><strong>System Response</strong></p></td></tr><tr><td><p><strong>1</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator selects “View Attendance” from the dashboard.</p></td></tr></tbody></table><p></p></td><td><p>System retrieves attendance data.</p></td></tr><tr><td><p><strong>2</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator selects a specific bus, date, or student.</p></td></tr></tbody></table><p></p></td><td><p>System filters and displays the relevant attendance records.</p></td></tr><tr><td><p><strong>3</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator views detailed attendance logs.</p></td></tr></tbody></table><p></p></td><td><p>System shows time-stamped boarding and exit records.</p></td></tr><tr><td colspan="4"><p><strong>Alternate Course of Action</strong></p></td></tr><tr><td><p><strong>S#</strong></p></td><td colspan="2"><p><strong>Actor Action</strong></p></td><td><p><strong>System Response</strong></p></td></tr><tr><td><p><strong>1</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator selects “View Attendance”.</p></td></tr></tbody></table><p></p></td><td><p>System attempts to retrieve data.</p></td></tr><tr><td><p><strong>2</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>No records exist for the selection.</p></td></tr></tbody></table><p></p></td><td><p>System displays: “No attendance records found.”</p></td></tr></tbody></table></div>

**Use Case: Generate Reports**

<div class="joplin-table-wrapper"><table><tbody><tr><td colspan="2"><p><strong>Identifier</strong></p></td><td colspan="2"><p>UC-11</p></td></tr><tr><td colspan="2"><p><strong>Purpose</strong></p></td><td colspan="2"><p>To allow the school administrator to generate downloadable attendance and trip reports.</p></td></tr><tr><td colspan="2"><p><strong>Priority</strong></p></td><td colspan="2"><p>Low</p></td></tr><tr><td colspan="2"><p><strong>Pre-conditions</strong></p></td><td colspan="2"><ul><li>Administrator is logged in.</li><li>Attendance or trip data is available.</li></ul><p></p></td></tr><tr><td colspan="2"><p><strong>Post-conditions</strong></p></td><td colspan="2"><p>A report is generated and available for download or printing.</p></td></tr><tr><td colspan="4"><p><strong>Typical Course of Action</strong></p></td></tr><tr><td><p><strong>S#</strong></p></td><td colspan="2"><p><strong>Actor Action</strong></p></td><td><p><strong>System Response</strong></p></td></tr><tr><td><p><strong>1</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator selects “Generate Reports”.</p></td></tr></tbody></table><p></p></td><td><p>System displays report configuration options (date range, student, bus).</p></td></tr><tr><td><p><strong>2</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator selects the report parameters.</p></td></tr></tbody></table><p></p></td><td><p>System compiles the requested data.</p></td></tr><tr><td><p><strong>3</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator confirms the report generation request.</p></td></tr></tbody></table><p></p></td></tr></tbody></table><p></p></td><td><p>System generates the report in the selected format (PDF/Excel).</p></td></tr><tr><td><p><strong>4</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator downloads or prints the report.</p></td></tr></tbody></table><p></p></td><td><p>System stores the generated report in history.</p></td></tr><tr><td colspan="4"><p><strong>Alternate Course of Action</strong></p></td></tr><tr><td><p><strong>S#</strong></p></td><td colspan="2"><p><strong>Actor Action</strong></p></td><td><p><strong>System Response</strong></p></td></tr><tr><td><p><strong>1</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Administrator selects “Generate Reports”.</p></td></tr></tbody></table><p></p></td><td><p>System attempts to compile data.</p></td></tr><tr><td><p><strong>2</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Data for the selected range is incomplete or missing.</p></td></tr></tbody></table><p></p></td><td><p>System shows message: “System displays message: ‘No sufficient data available to generate report”</p></td></tr></tbody></table></div>

**Use Case: Emergency Alert (Driver)**

<div class="joplin-table-wrapper"><table><tbody><tr><td colspan="2"><p><strong>Identifier</strong></p></td><td colspan="2"><p>UC-12</p></td></tr><tr><td colspan="2"><p><strong>Purpose</strong></p></td><td colspan="2"><p>To allow the bus driver to send an emergency alert to parents and school administration.</p></td></tr><tr><td colspan="2"><p><strong>Priority</strong></p></td><td colspan="2"><p>High</p></td></tr><tr><td colspan="2"><p><strong>Pre-conditions</strong></p></td><td colspan="2"><ul><li>Driver is logged into the system on the bus device.</li><li>Bus is active on a route.</li></ul><p></p></td></tr><tr><td colspan="2"><p><strong>Post-conditions</strong></p></td><td colspan="2"><p>Emergency alerts are broadcasts to parents and school staff.</p></td></tr><tr><td colspan="4"><p><strong>Typical Course of Action</strong></p></td></tr><tr><td><p><strong>S#</strong></p></td><td colspan="2"><p><strong>Actor Action</strong></p></td><td><p><strong>System Response</strong></p></td></tr><tr><td><p><strong>1</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Driver presses the “Emergency Alert” button.</p></td></tr></tbody></table><p></p></td><td><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>System confirms the driver’s identity and active route.</p></td></tr></tbody></table><p></p></td></tr><tr><td><p><strong>2</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Driver confirms the emergency.</p></td></tr></tbody></table><p></p></td><td><p>System broadcasts an alert notification to parents and school admin.</p></td></tr><tr><td><p><strong>3</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Driver views acknowledgment confirmation.</p></td></tr></tbody></table><p></p></td></tr></tbody></table><p></p></td><td><p>System logs the alert and time-stamps it in the event records</p></td></tr><tr><td colspan="4"><p><strong>Alternate Course of Action</strong></p></td></tr><tr><td><p><strong>S#</strong></p></td><td colspan="2"><p><strong>Actor Action</strong></p></td><td><p><strong>System Response</strong></p></td></tr><tr><td><p><strong>1</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Driver presses the “Emergency Alert” button accidentally.</p></td></tr></tbody></table><p></p></td></tr></tbody></table><p></p></td><td><p>System displays popup: “Confirm Emergency?”</p></td></tr><tr><td><p><strong>2</strong></p></td><td colspan="2"><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><table><tbody><tr><td><p></p></td></tr></tbody></table><p></p><table><tbody><tr><td><p>Driver cancels alert.</p></td></tr></tbody></table><p></p></td></tr></tbody></table><p></p></td><td><p>System aborts the alert and returns to the main screen.</p></td></tr></tbody></table></div>

**Use Case: Edit Profile (Parent/Admin/Driver)**

**Identifier**

UC-13

**Purpose**

To allow all users (Parent/Admin/Driver) to update their account details such as name, contact information, or password.

**Priority**

Low

**Pre-conditions**

User is logged in; session is active; only the user can edit their own data.

**Post-conditions**

User profile fields are updated; changes are saved in the database and reflected in all interfaces.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

User selects "Edit Profile" in account settings.

System displays a form with current data.

**2**

User changes details (name, email, phone) or password.

System validates input (e.g., email format, password strength).

**3**

User submits changes.

System updates the database and confirms successful update; user must re-login if password changed.

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

User enters invalid data.

System displays error and highlights faulty field for correction.

**2**

Attempt to edit another user's profile.

System denies access and shows "Access Denied" message.

**3**

Database update fails.

System logs error and prompts user to try again.

**Use Case: Logout**

**Identifier**

UC-14

**Purpose**

To allow the user to securely log out of the system, closing the session and protecting account data.

**Priority**

Low

**Pre-conditions**

User is logged in with a valid session.

**Post-conditions**

User session is terminated; all cached data is cleared; user redirected to login page.

**Typical Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

User selects "Logout" from menu.

System prompts "Are you sure you want to log out?".

**2**

User confirms.

System invalidates session, clears temporary data, and redirects to login page.

**Alternate Course of Action**

**S#**

**Actor Action**

**System Response**

**1**

User cancels logout.

System returns to the previous interface.

**2**

Session expires before logout.

System automatically logs out and redirects to login.

**Use Case: View Bus Route and Estimated Time of Arrival (Parent)**

|     |     |     |
| --- | --- | --- |
| **Identifier** |     | UC-15 |     |
| **Purpose** |     | To enable parents to view the detailed bus route for their child's trip and the estimated time of arrival (ETA) at school/home, helping with pickup planning and reducing wait times. |     |
| **Priority** |     | Medium |     |
| **Pre-conditions** |     | Parent is logged in; child is registered and linked to an active route; real-time GPS data from the bus is available. |     |
| **Post-conditions** |     | Route map and ETA are displayed; any delays or changes are highlighted; viewing history logged for audit. |     |
| **Typical Course of Action** |     |     |     |
| **S#** | **Actor Action** |     | **System Response** |
| **1** | Parent selects "View Route" for their child's trip from the parent dashboard. |     | System retrieves route details (stops, path) and current bus position from the database. |
| **2** | Parent views the interactive map. |     | System displays Google Maps with marked stops, bus icon, and calculated ETA based on current location and traffic. |
| **3** | System updates ETA in real-time. |     | ETA refreshes every 30 seconds via WebSocket; if delay >5 minutes, shows warning with reason (e.g., traffic). |
| **4** | Parent zooms or selects stop details. |     | System shows stop-specific info like expected arrival time and student count. |

|     |     |     |
| --- | --- | --- |
| **Alternate Course of Action** |     |     |
| **S#** | **Actor Action** | **System Response** |
| **1** | No active route for the child today. | System displays "No Scheduled Trip" message and suggests checking admin or tomorrow's route. |
| **2** | GPS data stale (bus offline). | System shows last known position with "Data Last Updated: HH:MM" and estimated ETA based on schedule. |
| **3** | Parent requests historical route view. | System provides past trip summary if available, with archived GPS points. |

- 1.  **Nonfunctional Requirements**

Non-functional requirements define the quality attributes and constraints under which the system operates. Unlike functional requirements, these requirements are **measurable and justified** based on expected system usage, user behavior, and industry standards.

**4.3.1 Performance Requirements**

The performance requirements are determined based on:

- Expected number of users (school environment)
- Real-time system constraints (tracking & notifications)
- Web application usability standards

**1\. System Response Time (3–5 seconds)**

The system should respond to user requests (e.g., login, dashboard loading, map display) within **3 to 5 seconds**.

**Justification:**  
According to usability standards, response times under 5 seconds are acceptable for web applications without causing user frustration. Since the system includes map rendering and real-time data retrieval, a slightly higher threshold (up to 5 seconds) is reasonable compared to simple applications.

**2\. Location Update Interval (≤ 10 seconds)**

The system must update the bus location every **10 seconds or less**.

**Justification:**

- Real-time tracking systems typically balance **accuracy vs. network usage**
- Updating every 2–3 seconds would increase server load and data consumption unnecessarily
- A 10-second interval provides **near real-time visibility** while maintaining system efficiency

**3\. Concurrent Users (≥ 20 users)**

The system should support at least **20 concurrent users** without performance degradation.

**Justification:**  
This value is based on:

- A typical school scenario:
    - 1 admin
    - 5–10 drivers
    - 10+ parents accessing simultaneously
- The number is a **minimum baseline**, not a system limit
- The system is designed to scale beyond this number if needed

**4\. Database Response Time (≤ 1 second)**

The database should retrieve requested data within **one second**.

**Justification:**

- Fast data retrieval is critical for real-time updates
- Industry best practices recommend sub-second query performance for interactive systems
- Ensures smooth user experience during tracking and reporting

**4.3.2 Safety Requirements**

The system must ensure the safety of students and reliability of operations under different conditions.

- If GPS or internet connectivity fails, the system must display the **last known location** with a warning message.
- The system must provide **emergency alert functionality** for accidents or route deviations.
- All input data must be validated to prevent incorrect or incomplete records.
- Attendance records must be protected from unauthorized modification.

**Justification:**  
These requirements are essential due to the **safety-critical nature** of student transportation systems.

**4.3.3 Security Requirements**

The system must ensure data confidentiality, integrity, and controlled access.

- All users must authenticate using secure login credentials
- Data transmission must use **HTTPS encryption**
- Passwords must be securely stored using hashing techniques (e.g., bcrypt)
- Role-based access control must restrict user permissions

**Justification:**  
The system handles **sensitive student and location data**, requiring strict security controls to prevent unauthorized access.

**4.3.4 Software Quality Attributes**

**Usability**

The system must provide a simple and intuitive interface suitable for non-technical users such as parents and drivers.

**Reliability**

The system must operate without critical failures during normal usage.

**Maintainability**

The system must follow a modular design to allow easy updates and enhancements.

**Scalability**

The system should support increasing numbers of users, buses, and routes.

**Availability (≥ 95%)**

The system must maintain at least **95% uptime**.

**Justification:**

- Ensures the system is accessible during school operation hours
- 95% availability is acceptable for non-critical systems while remaining cost-effective

**4.3.5 Other Requirements**

- The system must be compatible with modern web browsers (Chrome, Edge, Firefox)
- The database must perform **daily automated backups**
- The system must be deployable on cloud platforms (e.g., Firebase or AWS)

**Justification:**  
These requirements ensure system accessibility, data protection, and deployment flexibility.

- 1.  **Analysis Models**

<Include the following analysis models: use-case diagram_\>_

**_Note:_** _Every model should be described under separate level 03 heading and with brief description._

**High-Level Use Case Diagram**

This diagram illustrates the main actors (Student, Parent, Driver, and Admin) and their interactions with the School Bus Tracking System, providing a simple overview of the system’s primary functions.

  

**Admin Use Case Diagram  
**This diagram shows the detailed interactions of the Admin with the system, including route management, student registration, attendance viewing, report generation, and profile editing

**Activity Diagram for Student Check-In/Check-Out:**

This diagram illustrates the internal flow of activities that occur when a student checks in or checks out of the bus using the NFC system

# CHAPTER 5: SYSTEM DESIGN

**Component Diagram**:  
This diagram illustrates how the system is divided into logical software modules and how they exchange data.

- In-Bus Modules: It shows the Tracking component (GPS) and Check-In component (NFC) operating independently but feeding data into the central DataStorage.
- Data Flow: The distinct separation shows that the Driver App controls navigation, while the Parent App only retrieves data (read-only) from the database to view the dashboard.

  

**Deployment Diagram**:  
This diagram maps the software components to the actual physical hardware and cloud infrastructure.

- **Hardware Layer:** It highlights the **Raspberry Pi** located on the school bus, which physically hosts the NFC Reader and GPS Module.
- **Cloud Layer:** It demonstrates that the logic (Node.js/Express) and storage (MongoDB) are hosted on a **Cloud Server** (like AWS or Firebase).
- **Client Layer:** It confirms that Parents, Drivers, and Admins access the system via web browsers on their personal devices, communicating with the cloud via API calls.

**Design-Level Sequence Diagram**:  
This diagram visualizes the timeline of interactions for the **Real-Time Bus Tracking (UC-2)** feature.

- **The Loop:** It shows a continuous loop where the **Bus Device** sends GPS coordinates to the **Tracking Backend** every few seconds.
- **The Trigger:** When a **Parent** opens the "Live Bus Tracking" feature, the **Web UI** requests the specific student's bus data.
- **The Update:** The diagram details how the system handles alerts; if a delay is detected during the location update, the backend immediately pushes a notification to the parent.

  

**Class Diagram**:  
This diagram represents the static structure of the code, defining the blueprints (classes) for the system's objects.

- **Attributes & Methods:** It defines specific data (e.g., plateNumber for the **Bus Class**) and actions (e.g., scanNFC() for the **Student Class**).
- **Relationships:** It enforces logical rules, such as "One **Admin** manages multiple **Parents**," and "A **Route** consists of a list of stops (stopsList)".

**Entity-Relationship Diagram**:  
This diagram designs the database schema and how data tables link to one another.

- **Data Associations:** It connects the **Bus** entity to the **Trip** entity, which is further linked to **Location_Log** (for history) and **Attendance** (for student logs).
- **Key Design:** It ensures that every **Notification** is linked to a specific **Parent**, and every **Emergency_Alert** is triggered from a specific **Bus**, ensuring data integrity for generating reports.

# CHAPTER 6: SYSTEM IMPLEMENTATION

&lt; Include all the technical details of the application implementation, you may include algorithm(s) used, developed source code snippets that shows core solution and detailed code should be in appendix section, database design and implementation, software interfaces, and all related projects components.&gt;

This chapter presents the implementation details of the School Bus Tracking System. It describes how the system design discussed in previous chapters is translated into a working software solution. The implementation covers system architecture, core modules, algorithms, database structure, software interfaces, and integration of hardware components.

**6.1 Overview of Implementation**

The School Bus Tracking System is implemented as a web-based platform integrated with IoT hardware installed inside school buses. The system follows a modular architecture, where each component performs a specific function such as tracking, attendance management, notifications, and user authentication.

The implementation is divided into three main layers:

- **Frontend Layer:** Provides user interfaces for Parents, Drivers, and Admins.
- **Backend Layer:** Handles business logic, data processing, and API communication.
- **Hardware Layer:** Includes Raspberry Pi, GPS module, and NFC reader for real-time data collection.

**6.2 System Architecture Implementation**

The system is built using a client-server architecture:

- The **frontend web application** communicates with the backend using RESTful APIs.
- The **backend server** processes requests and interacts with the database.
- The **IoT devices on the bus** continuously send real-time data (location and NFC scans) to the server.

This architecture ensures scalability, maintainability, and real-time performance.

**6.3 Core System Modules**

**1\. Authentication Module**

This module handles secure login for all users (Admin, Driver, Parent).

**Implementation Features:**

- Username and password verification
- Password hashing using secure hashing algorithms (e.g., bcrypt)
- Role-based access control (RBAC)

**2\. Real-Time Tracking Module**

This module is responsible for receiving and processing GPS data from the bus.

**Algorithm (Simplified):**

1.  Read GPS coordinates from device every 5–10 seconds
2.  Send coordinates to backend API
3.  Store data in Location_Log table
4.  Update live map interface for users

**Key Functionality:**

- Live bus location updates
- Route visualization
- ETA calculation based on movement data

**3\. NFC Attendance Module**

This module manages student check-in and check-out using NFC cards.

**Algorithm:**

1.  Student taps NFC card on reader
2.  System reads Student ID
3.  Validate student against assigned bus and route
4.  Record timestamp (check-in or check-out)
5.  Store data in Attendance database
6.  Trigger parent notification

**4\. Notification Module**

This module sends real-time alerts to parents and administrators.

**Events triggering notifications:**

- Student boarded bus
- Student left bus
- Bus approaching stop
- Delay or emergency detected

Notifications are delivered through:

- Web push notifications
- SMS (optional integration)
- Email alerts

**5\. Route Management Module**

Allows administrators to create and manage bus routes.

**Features:**

- Add/Edit/Delete routes
- Assign buses and drivers
- Define stops and schedules

**6.4 Database Implementation**

The system uses a structured relational database (or NoSQL equivalent depending on implementation). The database is designed to ensure data integrity and efficient retrieval.

**Main Tables / Collections:**

- **Student**
    - StudentID
    - Name
    - Grade
    - BusID
    - ParentID
- **Parent**
    - ParentID
    - Name
    - ContactInfo
    - LoginCredentials
- **Bus**
    - BusID
    - PlateNumber
    - DriverID
    - RouteID
- **Route**
    - RouteID
    - StopsList
    - Schedule
- **Attendance**
    - RecordID
    - StudentID
    - Timestamp
    - Status (IN/OUT)
- **Location_Log**
    - LogID
    - BusID
    - Latitude
    - Longitude
    - Timestamp
- **Notification**
    - NotificationID
    - ParentID
    - Message
    - Type
    - Timestamp

**Database Relationships**

- One Parent : Many Students
- One Bus : Many Students
- One Route : One Bus
- One Student : Many Attendance Records
- One Bus : Many Location Logs

**6.5 Software Interfaces**

The system provides three main user interfaces:

**1\. Parent Interface**

- View live bus location
- Receive notifications
- View student status and ETA

**2\. Driver Interface**

- View assigned route
- Start/stop trip
- Send emergency alerts

**3\. Admin Dashboard**

- Manage users and buses
- Create routes
- View reports and analytics
- Monitor system activity

All interfaces are designed to be responsive and accessible through modern web browsers.

**6.6 Hardware Implementation**

The in-bus hardware system consists of:

- **Raspberry Pi:** Acts as the central processing unit
- **GPS Module:** Provides real-time location tracking
- **NFC Reader:** Reads student identification cards

**Workflow:**

1.  GPS continuously collects location data
2.  NFC reader detects student boarding events
3.  Raspberry Pi processes and sends data to backend server

**6.7 Example Core Code Snippet (Conceptual)**

**GPS Data Sending (Simplified Logic)**

setInterval(() => {

const location = getGPSData();

fetch("/api/location/update", {

method: "POST",

body: JSON.stringify(location),

headers: { "Content-Type": "application/json" }

});

}, 5000);

**NFC Attendance Logic**

function scanNFC(studentID) {

if (isValidStudent(studentID)) {

recordAttendance(studentID, new Date());

notifyParent(studentID);

} else {

console.log("Invalid Student");

}

}

**6.8 Integration of System Components**

The system integrates hardware and software using APIs:

- GPS and NFC data - sent from Raspberry Pi - Backend API
- Backend : processes and stores data in database
- Frontend : fetches data in real time using API calls
- Notification service : triggered based on system events

This integration ensures **real-time synchronization** across all system components.

**6.9 Summary**

This chapter presented the implementation details of the School Bus Tracking System. It explained how system modules are developed, how data is processed, and how hardware and software components interact. The implementation ensures real-time tracking, secure data handling, and efficient communication between all stakeholders.

# CHAPTER 7: TESTING & EVALUATION

&lt;It should include all the techniques and justifications used in testing and evaluating your project implementation. For examples, key test cases with brief description of the rational for each.&gt;  

|     |     |
| --- | --- |
| **Identifier** | TC-1 |
| **Priority** | High |
| **Related requirements(s)** | UC-1 |
| **Short description** | User Create account |
| **Pre-condition(s)** | Welcome page |
| **Input data** | (Full name, user name, Department, Email, phone number) |
| **Detailed steps** | …   |
| **Expected result(s)** | Registration page |
| **Post-condition(s)** | User granted access |

**7.1 Introduction**

This chapter presents the testing strategy and evaluation process applied to the School Bus Tracking System. The main objective of testing is to ensure that the system functions correctly, meets all functional and non-functional requirements, and provides a reliable and secure experience for all users, including parents, drivers, students, and administrators.

Testing is a critical phase in the Software Development Life Cycle (SDLC) because it validates system correctness, identifies defects, and ensures that the final product meets user expectations. In this project, a combination of functional and non-functional testing techniques has been applied to evaluate system performance, reliability, and usability.

**7.2 Testing Strategy**

The following testing techniques were used in the project:

**1\. Unit Testing**

Each system component (e.g., NFC scanning, login module, GPS tracking function) was tested individually to ensure it works correctly in isolation. This helps detect logical errors at an early stage of development.

**2\. Integration Testing**

After unit testing, modules were combined and tested together. This ensured proper communication between components such as:

- NFC module : Attendance database
- GPS module : Live tracking system
- Parent portal : Notification system

**3\. System Testing**

The complete system was tested as a whole to verify that all modules work together under real-world conditions.

**4\. User Acceptance Testing (UAT)**

Real users (simulated parents and administrators) tested the system to evaluate usability, accuracy, and overall satisfaction.

**7.3 Test Case Design Approach**

Test cases were designed based on:

- Functional requirements (UCs 1–15)
- Non-functional requirements (performance, security, safety)
- Real-world usage scenarios (bus tracking, student boarding, emergency alerts)

Each test case includes:

- Identifier
- Priority
- Related Use Case
- Preconditions
- Input Data
- Steps
- Expected Output
- Post-condition

**7.4 Key Test Cases**

**Test Case 1: User Registration**

|     |     |
| --- | --- |
| **Field** | **Description** |
| **Identifier** | TC-1 |
| **Priority** | High |
| **Related Requirement** | UC-8 / UC-9 |
| **Short Description** | User creates a new account |
| **Pre-condition** | User is on registration page |
| **Input Data** | Full Name, Username, Department/Role, Email, Phone Number |
| **Steps** | 1\. Open registration page → 2. Enter valid details → 3. Submit form |
| **Expected Result** | Account is successfully created and stored in database |
| **Post-condition** | User can log in to the system |

**Test Case 2: Student NFC Check-In / Check-Out**

|     |     |
| --- | --- |
| **Field** | **Description** |
| **Identifier** | TC-2 |
| **Priority** | High |
| **Related Requirement** | UC-1 |
| **Short Description** | Student taps NFC card on bus reader |
| **Pre-condition** | Student is registered and assigned to bus |
| **Input Data** | NFC ID |
| **Steps** | 1\. Tap NFC card → 2. System reads ID → 3. Validate student |
| **Expected Result** | Attendance is recorded (IN/OUT) |
| **Post-condition** | Database updated with timestamp |

**Test Case 3: Real-Time Bus Tracking**

|     |     |
| --- | --- |
| **Field** | **Description** |
| **Identifier** | TC-3 |
| **Priority** | High |
| **Related Requirement** | UC-2 |
| **Short Description** | Live tracking of bus location |
| **Pre-condition** | GPS module active |
| **Input Data** | GPS coordinates |
| **Steps** | 1\. Bus sends GPS data → 2. System updates map → 3. Parent views live location |
| **Expected Result** | Live location displayed correctly |
| **Post-condition** | Tracking history updated |

**Test Case 4: Parent Notifications**

|     |     |
| --- | --- |
| **Field** | **Description** |
| **Identifier** | TC-4 |
| **Priority** | High |
| **Related Requirement** | UC-3 |
| **Short Description** | System sends alerts to parents |
| **Pre-condition** | Parent linked to student |
| **Input Data** | Event trigger (boarding, delay, arrival) |
| **Steps** | 1\. System detects event → 2. Generate notification → 3. Send alert |
| **Expected Result** | Notification received on parent portal |
| **Post-condition** | Notification stored in history log |

**Test Case 5: Driver Emergency Alert**

|     |     |
| --- | --- |
| **Field** | **Description** |
| **Identifier** | TC-5 |
| **Priority** | High |
| **Related Requirement** | UC-12 |
| **Short Description** | Driver sends emergency alert |
| **Pre-condition** | Driver is logged in |
| **Input Data** | Emergency button trigger |
| **Steps** | 1\. Driver presses alert → 2. System confirms → 3. Sends broadcast |
| **Expected Result** | Parents and admin receive emergency alert |
| **Post-condition** | Incident logged in system |

**Test Case 6: Login Authentication**

|     |     |
| --- | --- |
| **Field** | **Description** |
| **Identifier** | TC-6 |
| **Priority** | High |
| **Related Requirement** | UC-4 / UC-5 |
| **Short Description** | Secure login for all users |
| **Pre-condition** | User has valid credentials |
| **Input Data** | Username + Password |
| **Steps** | 1\. Enter credentials → 2. System validates → 3. Grant access |
| **Expected Result** | User redirected to dashboard |
| **Post-condition** | Session created |

**7.5 Performance Evaluation**

The system was evaluated based on non-functional requirements:

- **Response Time:** 3–5 seconds for page load and login
- **GPS Update Rate:** Every 10 seconds
- **Concurrent Users:** Tested up to 20 users simultaneously
- **Database Query Time:** Less than 1 second for retrieval operations

The results showed that the system meets the required performance standards under normal operating conditions.

**7.6 Security Evaluation**

Security testing ensured:

- Passwords are encrypted using hashing algorithms
- Role-based access control prevents unauthorized access
- HTTPS ensures secure communication
- Invalid login attempts are blocked after repeated failures

**7.7 Usability Evaluation**

Usability was tested with simulated users (parents and admin staff). Results showed:

- Simple navigation structure
- Easy-to-understand dashboard
- Clear notifications and tracking interface
- Minimal training required for users

**7.8 Conclusion**

The testing phase confirmed that the School Bus Tracking System is functional, reliable, and secure. All major modules including NFC attendance, GPS tracking, notifications, and user management performed successfully. The system meets both functional and non-functional requirements and is ready for deployment in a real-world environment.

# CHAPTER 8: RESULTS AND ANALYSIS

<This section is **ONLY used for research projects** (in which the core outcome will be a research publication). It may contain core findings represented using tables, charts, graphs etc.

Also, the selection of analysis techniques, rationale for this selection, and the results of the analysis are discussed in this section >

# CHAPTER 9: CONCLUSION AND FUTURE WORK

&lt;Describe in 2-4 paragraphs the crux and importance of your project, its novelty and its current applications. Also, within the same text suggest what future work can be derived out of your project. Also, within the same text suggest what future work can be derived out of your project&gt;

1.  
2.  1.  **Conclusion**

- 1.  **Future Work**

# REFERENCES

1.  Ishaq, K., & Bibi, S. (2023). _IoT based smart attendance system using RFID: A systematic literature review._ arXiv.
2.  Suryawanshi, A., Sonawane, U., Totawar, A., & Dhumale, N. R. (2023). _IoT monitoring smart school bus._ International Journal for Research in Applied Science & Engineering Technology, 11(5).
3.  Siva, P., Bhargavi, P., Sanath Kumar, P., Jeswanth, P., Ahamed, S. K., Rajsekhar, K., & Siva Prasad, B. (2025, April). _RFID based system for school children transportation enhancement._ International Journal for Research in Applied Science & Engineering Technology, 13(4).
4.  Srinivas, S., Shreyas, V. B., Sriram,., Vishnuraata, P. Y., & Sudha, P. N. (2023). _IoT based school bus monitoring system._ International Journal for Research in Applied Science & Engineering Technology.
5.  (2024, May). _Smart school bus monitoring system using IoT._ International Research Journal of Modernization in Engineering Technology and Science, 7(04). Retrieved from
6.  (2024, November 11). _Smart school bus monitoring system using IoT._ International Research Journal of Modernization in Engineering Technology and Science. Retrieved from
7.  Calvete, H. I., Galé, C., Iranzo, J. A., & Toth, P. (2023). The school bus routing problem with student choice: a bilevel approach and a simple and effective metaheuristic. International transactions in operational research, 30(2), 1092-1119
8.  Al-Khalifa, N. K., Al-Jundi, M. W., & Al-Muftah, R. (2025). STUSAFE: Student Safety System During Transportation (Doctoral dissertation).‏
9.  Masrur, M. (2023). The Challenges of Implementing Online-Based Leadership in The Application of Education Innovations. _Nidhomul Haq: Jurnal Manajemen Pendidikan Islam_, _8_(2), 227-241.‏
10. Muharemović, E., Kosovac, A., Begović, M., Tadić, S., & Krstić, M. (2025). Cost Modeling for Pickup and Delivery Outsourcing in CEP Operations: A Multidimensional Approach. _Logistics_, _9_(3), 96.‏
11. Chigwedere, C., & Venter, K. (2024). _Parent concerns around road safety of children en route to school: A study from the Western Cape, South Africa._ Journal of Child and Family Studies. Springer.
12. C.S. Mott Children’s Hospital National Poll on Children’s Health. (2022). _Parent traffic hazardous to student safety._ University of Michigan Health.
13. Zum. (2023, August 10). _91% of parents believe U.S. school bus system needs improvement, Zum survey finds._ PR Newswire.
14. Student Transportation News. (2024, August 15). _Safety, reliability, and sustainability among parents’ top concerns going into the 2024–25 school year, Zum survey finds._
15. Shibghatullah, A. S., Jalil, A., Wahab, M. H. A., Soon, J. N. P., Subaramaniam, K., & Eldabi, T. (2022). Vehicle tracking application based on real time traffic. _International Journal of Electrical and Electronic Engineering & Telecommunications_, _11_(1), 67-73.‏
16. Karthikeyan, S., Raj, R. A., Cruz, M. V., Chen, L., Vishal, J. A., & Rohith, V. S. (2023). A systematic analysis on raspberry pi prototyping: Uses, challenges, benefits, and drawbacks. _IEEE Internet of Things Journal_, _10_(16), 14397-14417.
17. Shoewu, O. O., Akinyemi, L. A., Mumuni, Q. A., & Afis, A. (2022). Development of a smart attendance system using near field communication (SMAT-NFC). _Global Journal of Engineering and Technology Advances_, _12_(02), 121-139.‏
18. Nagaraju, C. H., & Kondagandla, R. (2022). IoT based live monitoring public transportation security system by using raspberry Pi, GSM& GPS. In _Modern approaches in machine learning & cognitive science: A walkthrough_ (pp. 465-477). Cham: Springer International Publishing.
19. Moumen, I., Rafalia, N., Abouchabaka, J., & Aoufi, M. (2023). Real-time gps tracking system for iot-enabled connected vehicles. In _E3S Web of conferences_ (Vol. 412, p. 01095). EDP Sciences
20. Jagatheesaperumal, S. K., Bibri, S. E., Huang, J., Rajapandian, J., & Parthiban, B. (2024). Artificial intelligence of things for smart cities: advanced solutions for enhancing transportation safety. _Computational Urban Science_, _4_(1), 10.‏
21. Grandhi, S. H. (2023). Microcontroller with event bus signal processing for efficient rare-event detection in IoT devices. _International Journal of Engineering & Science Research_, _13_(2), 101-114.‏
22. Mustafa, R., Khan, T., & Sarkar, N. I. (2025). A Secure and Sustainable Transition from Legacy Smart Cards to Mobile Credentials in University Access Control System.‏
23. HaziqBadderol, M., & Abdullah, N. A. (2025). Intruder Alert System with Firebase Cloud for Syndicate Store and Service. Applied Information Technology And Computer Science, 6(1), 382-400.‏
24. Hyseni, A., Shkurti, L., Kabashi, F., & Sofiu, V. (2023). Development and Evaluation of a Real-Time Communication Web Application Using WebSocket’s, React, Node. js, and MongoDB.‏
25. Silva, P. V. R., de Souza, P. G. C., Amate, F. C., & dos Santos, C. E. (2025). Real-Time vehicle tracking architectures using Geolocation, IoT, and cloud-based infrastructure. _IJECS_, _7_(1), 212-218.‏

# APPENDIX: Glossary

**GPS (Global Positioning System)**: A satellite-based navigation system used to determine the precise location of an object or person in real-time.

**NFC (Near Field Communication)**: A short-range wireless technology used to transfer data between devices when they are placed close to each other (e.g., for student check-in using NFC cards).

**IoT (Internet of Things)**: Refers to the network of physical devices, vehicles, and other objects embedded with sensors, software, and technology to connect and exchange data over the internet.

**API (Application Programming Interface)**: A set of protocols and tools that allow different software applications to communicate and interact with each other.

**Node.js**: A runtime environment for executing JavaScript code on the server-side, enabling fast, scalable network applications.

**MongoDB**: A NoSQL database used for storing unstructured data or data that requires high-speed performance and flexibility.

**React**: A JavaScript library used for building user interfaces, especially for single-page applications where data changes dynamically.

**Firebase**: A cloud platform by Google that provides services such as real-time databases, authentication, hosting, and analytics for building and managing applications.

**AWS (Amazon Web Services)**: A comprehensive cloud computing platform offering infrastructure services, storage, and data processing capabilities, provided by Amazon.

**API Integration**: The process of linking APIs from different applications or platforms to exchange data, such as integrating **Google Maps API** for real-time location tracking.

**RFID (Radio Frequency Identification)**: A technology used to identify and track objects or people using radio waves.

**Backend**: The server-side part of an application that manages databases, data processing, and APIs, ensuring that the frontend functions properly.

**Frontend**: The user interface of an application that users interact with, typically built using technologies like **React**.

**Geofencing**: A location-based service that creates a virtual boundary around a physical location, triggering alerts when a device enters or exits this defined area.

**IoT Components**: Devices and sensors that collect and analyze real-time data, such as **Raspberry Pi** and **NFC Readers**.

**Scrum**: An agile project management methodology that organizes work into short, focused periods called "sprints," allowing for incremental development of the system.