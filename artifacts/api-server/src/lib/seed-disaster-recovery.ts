import {
  db,
  drProceduresTable,
  drProcedureStepsTable,
  drTestResultsTable,
  drBusinessImpactTable,
  drFailoverConfigTable,
  drCommunicationPlanTable,
  drComplianceChecklistTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

export async function seedDisasterRecovery() {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(drProceduresTable);

  if ((countResult?.count ?? 0) > 0) return;

  console.log("Seeding disaster recovery data...");

  const procedures = await db.insert(drProceduresTable).values([
    {
      scenario: "database_failure",
      title: "Database Failure Recovery",
      description: "Complete recovery procedure for primary database failure including failover to replica and data integrity verification.",
      priority: "critical",
      rtoMinutes: 15,
      rpoMinutes: 5,
      estimatedRecoveryMinutes: 12,
      requiredPersonnel: "DBA Lead, Infrastructure Engineer, Application Lead",
      dependencies: "Replica database, backup storage, monitoring systems",
      lastTestedAt: new Date("2026-02-15"),
      lastTestResult: "pass",
      status: "active",
    },
    {
      scenario: "application_server_failure",
      title: "Application Server Failure Recovery",
      description: "Procedure for recovering from complete application server failure, including load balancer reconfiguration and service restoration.",
      priority: "critical",
      rtoMinutes: 10,
      rpoMinutes: 0,
      estimatedRecoveryMinutes: 8,
      requiredPersonnel: "DevOps Lead, Application Engineer, Network Engineer",
      dependencies: "Standby servers, container registry, load balancer",
      lastTestedAt: new Date("2026-03-01"),
      lastTestResult: "pass",
      status: "active",
    },
    {
      scenario: "network_outage",
      title: "Network Outage Recovery",
      description: "Recovery procedure for complete network outage affecting internal and external connectivity.",
      priority: "high",
      rtoMinutes: 30,
      rpoMinutes: 0,
      estimatedRecoveryMinutes: 25,
      requiredPersonnel: "Network Engineer, ISP Liaison, Security Lead",
      dependencies: "Backup ISP, Tailscale mesh network, DNS failover",
      lastTestedAt: new Date("2026-01-20"),
      lastTestResult: "partial",
      status: "active",
    },
    {
      scenario: "security_breach",
      title: "Security Breach Response",
      description: "Incident response and recovery procedure for confirmed security breach including containment, eradication, and recovery phases.",
      priority: "critical",
      rtoMinutes: 60,
      rpoMinutes: 15,
      estimatedRecoveryMinutes: 45,
      requiredPersonnel: "CISO, Security Analyst, Legal Counsel, Communications Lead",
      dependencies: "Forensic tools, isolated network segment, backup systems",
      lastTestedAt: new Date("2026-02-28"),
      lastTestResult: "pass",
      status: "active",
    },
    {
      scenario: "data_corruption",
      title: "Data Corruption Recovery",
      description: "Procedure for detecting and recovering from data corruption across databases, files, and application state.",
      priority: "high",
      rtoMinutes: 45,
      rpoMinutes: 30,
      estimatedRecoveryMinutes: 40,
      requiredPersonnel: "DBA Lead, Data Engineer, QA Lead",
      dependencies: "Point-in-time backup, data validation tools, staging environment",
      lastTestedAt: null,
      lastTestResult: null,
      status: "active",
    },
    {
      scenario: "ransomware_attack",
      title: "Ransomware Attack Recovery",
      description: "Complete recovery procedure for ransomware attack including network isolation, malware removal, and clean system restoration from verified backups.",
      priority: "critical",
      rtoMinutes: 120,
      rpoMinutes: 60,
      estimatedRecoveryMinutes: 90,
      requiredPersonnel: "CISO, Security Analyst, Legal Counsel, FBI Liaison, Communications Lead",
      dependencies: "Air-gapped backups, clean OS images, forensic tools, isolated recovery environment",
      lastTestedAt: new Date("2026-01-10"),
      lastTestResult: "partial",
      status: "active",
    },
    {
      scenario: "infrastructure_loss",
      title: "Complete Infrastructure Loss Recovery",
      description: "Disaster recovery for complete loss of primary infrastructure including all servers, networking, and storage systems.",
      priority: "critical",
      rtoMinutes: 240,
      rpoMinutes: 60,
      estimatedRecoveryMinutes: 180,
      requiredPersonnel: "CTO, Infrastructure Lead, All Engineering Leads, Vendor Support",
      dependencies: "DR site, off-site backups, cloud failover, hardware vendor SLAs",
      lastTestedAt: new Date("2025-12-15"),
      lastTestResult: "pass",
      status: "active",
    },
  ]).returning();

  const procMap = new Map(procedures.map((p) => [p.scenario, p.id]));

  await db.insert(drProcedureStepsTable).values([
    { procedureId: procMap.get("database_failure")!, stepOrder: 1, title: "Detect and Confirm Failure", description: "Verify database failure through monitoring alerts and manual connection tests. Confirm the failure is not a network issue.", estimatedMinutes: 2, responsible: "DBA Lead" },
    { procedureId: procMap.get("database_failure")!, stepOrder: 2, title: "Activate Read Replica Promotion", description: "Promote the standby read replica to primary. Update connection strings in the application configuration.", estimatedMinutes: 3, responsible: "DBA Lead" },
    { procedureId: procMap.get("database_failure")!, stepOrder: 3, title: "Verify Data Integrity", description: "Run data integrity checks on the promoted replica. Compare recent transaction logs to ensure no data was lost.", estimatedMinutes: 5, responsible: "Data Engineer" },
    { procedureId: procMap.get("database_failure")!, stepOrder: 4, title: "Restore Application Connectivity", description: "Update all application services to point to the new primary database. Verify connection pooling and query performance.", estimatedMinutes: 2, responsible: "Application Lead" },

    { procedureId: procMap.get("application_server_failure")!, stepOrder: 1, title: "Identify Failed Servers", description: "Use monitoring dashboard to identify which application servers have failed. Check health endpoints and container status.", estimatedMinutes: 1, responsible: "DevOps Lead" },
    { procedureId: procMap.get("application_server_failure")!, stepOrder: 2, title: "Remove from Load Balancer", description: "Remove failed servers from the load balancer rotation to prevent traffic routing to unhealthy instances.", estimatedMinutes: 1, responsible: "Network Engineer" },
    { procedureId: procMap.get("application_server_failure")!, stepOrder: 3, title: "Launch Replacement Instances", description: "Deploy new application server instances from the latest verified container image. Scale to match capacity requirements.", estimatedMinutes: 4, responsible: "DevOps Lead" },
    { procedureId: procMap.get("application_server_failure")!, stepOrder: 4, title: "Health Check and Re-register", description: "Run health checks on new instances. Add to load balancer once all checks pass. Verify end-to-end request flow.", estimatedMinutes: 2, responsible: "Application Engineer" },

    { procedureId: procMap.get("network_outage")!, stepOrder: 1, title: "Assess Outage Scope", description: "Determine if the outage is internal, ISP-related, or DNS. Run traceroutes and check ISP status pages.", estimatedMinutes: 5, responsible: "Network Engineer" },
    { procedureId: procMap.get("network_outage")!, stepOrder: 2, title: "Activate Backup ISP", description: "Switch to backup ISP connection. Update BGP routing or DNS records as needed.", estimatedMinutes: 10, responsible: "Network Engineer" },
    { procedureId: procMap.get("network_outage")!, stepOrder: 3, title: "Verify Tailscale and Internal Services", description: "Ensure Tailscale mesh connections are re-established. Verify internal service communication across all zones.", estimatedMinutes: 5, responsible: "Network Engineer" },
    { procedureId: procMap.get("network_outage")!, stepOrder: 4, title: "Validate External Connectivity", description: "Test external-facing services. Verify CDN, API endpoints, and customer-facing applications are accessible.", estimatedMinutes: 5, responsible: "ISP Liaison" },

    { procedureId: procMap.get("security_breach")!, stepOrder: 1, title: "Contain the Breach", description: "Isolate affected systems from the network. Block compromised accounts. Preserve evidence for forensic analysis.", estimatedMinutes: 10, responsible: "Security Analyst" },
    { procedureId: procMap.get("security_breach")!, stepOrder: 2, title: "Assess Scope and Impact", description: "Determine what systems and data were accessed. Identify the attack vector and timeline of compromise.", estimatedMinutes: 15, responsible: "CISO" },
    { procedureId: procMap.get("security_breach")!, stepOrder: 3, title: "Eradicate the Threat", description: "Remove malware, close vulnerabilities, reset compromised credentials. Patch systems that were exploited.", estimatedMinutes: 10, responsible: "Security Analyst" },
    { procedureId: procMap.get("security_breach")!, stepOrder: 4, title: "Restore and Monitor", description: "Restore affected systems from clean backups. Implement enhanced monitoring. Notify affected parties per legal requirements.", estimatedMinutes: 10, responsible: "Legal Counsel" },

    { procedureId: procMap.get("data_corruption")!, stepOrder: 1, title: "Identify Corrupted Data Sets", description: "Run integrity checks across all databases and file stores. Identify the scope and timeline of corruption.", estimatedMinutes: 10, responsible: "DBA Lead" },
    { procedureId: procMap.get("data_corruption")!, stepOrder: 2, title: "Isolate Affected Systems", description: "Take corrupted systems offline to prevent further spread. Redirect traffic to healthy replicas if available.", estimatedMinutes: 5, responsible: "Infrastructure Engineer" },
    { procedureId: procMap.get("data_corruption")!, stepOrder: 3, title: "Restore from Point-in-Time Backup", description: "Identify the last known good state. Restore from point-in-time backup. Replay valid transactions after the corruption point.", estimatedMinutes: 20, responsible: "Data Engineer" },
    { procedureId: procMap.get("data_corruption")!, stepOrder: 4, title: "Validate Restored Data", description: "Run comprehensive data validation. Compare checksums and record counts against known good values.", estimatedMinutes: 5, responsible: "QA Lead" },

    { procedureId: procMap.get("ransomware_attack")!, stepOrder: 1, title: "Isolate All Systems", description: "Immediately disconnect all systems from the network. Disable Wi-Fi, revoke Tailscale node keys, and cut cloud connectivity. Shut down affected endpoints.", estimatedMinutes: 5, responsible: "Security Analyst" },
    { procedureId: procMap.get("ransomware_attack")!, stepOrder: 2, title: "Assess Encryption Scope", description: "Identify which systems and files are encrypted. Determine the ransomware variant. Do NOT pay the ransom.", estimatedMinutes: 15, responsible: "CISO" },
    { procedureId: procMap.get("ransomware_attack")!, stepOrder: 3, title: "Notify Law Enforcement", description: "Contact FBI IC3, local law enforcement, and legal counsel. Preserve all evidence including ransom notes and logs.", estimatedMinutes: 10, responsible: "Legal Counsel" },
    { procedureId: procMap.get("ransomware_attack")!, stepOrder: 4, title: "Restore from Air-Gapped Backups", description: "Boot clean OS images on wiped hardware. Restore data from verified air-gapped backups. Scan all restored files before reconnecting.", estimatedMinutes: 45, responsible: "Infrastructure Lead" },
    { procedureId: procMap.get("ransomware_attack")!, stepOrder: 5, title: "Harden and Reconnect", description: "Apply all security patches. Reset every credential. Enable enhanced monitoring. Gradually reconnect systems.", estimatedMinutes: 15, responsible: "Security Analyst" },

    { procedureId: procMap.get("infrastructure_loss")!, stepOrder: 1, title: "Activate DR Site", description: "Contact DR site team. Begin spinning up infrastructure at the disaster recovery location.", estimatedMinutes: 15, responsible: "CTO" },
    { procedureId: procMap.get("infrastructure_loss")!, stepOrder: 2, title: "Restore Core Services", description: "Deploy database, authentication, and core application services at the DR site from off-site backups.", estimatedMinutes: 60, responsible: "Infrastructure Lead" },
    { procedureId: procMap.get("infrastructure_loss")!, stepOrder: 3, title: "Redirect DNS and Traffic", description: "Update DNS records to point to DR site. Configure CDN failover. Verify SSL certificates.", estimatedMinutes: 30, responsible: "Network Engineer" },
    { procedureId: procMap.get("infrastructure_loss")!, stepOrder: 4, title: "Validate All Services", description: "Run complete integration test suite. Verify all critical business functions. Begin accepting production traffic.", estimatedMinutes: 45, responsible: "All Engineering Leads" },
    { procedureId: procMap.get("infrastructure_loss")!, stepOrder: 5, title: "Communicate Status", description: "Provide status updates to all stakeholders, customers, and regulatory bodies as required.", estimatedMinutes: 30, responsible: "Communications Lead" },
  ]);

  await db.insert(drTestResultsTable).values([
    {
      procedureId: procMap.get("database_failure")!,
      testDate: new Date("2026-02-15"),
      outcome: "pass",
      actualRecoveryMinutes: 11,
      notes: "Replica promotion completed in under target RTO. All data integrity checks passed.",
      gapsFound: null,
      remediationStatus: "resolved",
      conductedBy: "Sarah Chen, DBA Lead",
    },
    {
      procedureId: procMap.get("application_server_failure")!,
      testDate: new Date("2026-03-01"),
      outcome: "pass",
      actualRecoveryMinutes: 7,
      notes: "Container deployment was faster than expected. Health checks all green within 7 minutes.",
      gapsFound: null,
      remediationStatus: "resolved",
      conductedBy: "Marcus Johnson, DevOps Lead",
    },
    {
      procedureId: procMap.get("network_outage")!,
      testDate: new Date("2026-01-20"),
      outcome: "partial",
      actualRecoveryMinutes: 35,
      notes: "Backup ISP switch was successful but DNS propagation took longer than expected.",
      gapsFound: "DNS TTL values too high. Recommend reducing to 60s for critical records. Also need to automate BGP failover.",
      remediationStatus: "in_progress",
      conductedBy: "Alex Rivera, Network Engineer",
    },
    {
      procedureId: procMap.get("security_breach")!,
      testDate: new Date("2026-02-28"),
      outcome: "pass",
      actualRecoveryMinutes: 42,
      notes: "Tabletop exercise completed successfully. All team members knew their roles. Evidence preservation procedure was well-executed.",
      gapsFound: null,
      remediationStatus: "resolved",
      conductedBy: "Diana Park, CISO",
    },
    {
      procedureId: procMap.get("ransomware_attack")!,
      testDate: new Date("2026-01-10"),
      outcome: "partial",
      actualRecoveryMinutes: 110,
      notes: "Air-gapped backup restoration worked but was slower than expected. Clean OS image deployment needs streamlining.",
      gapsFound: "Need pre-staged clean images at DR site. File scanning of restored data took too long — need parallel scanning capability.",
      remediationStatus: "pending",
      conductedBy: "Diana Park, CISO",
    },
    {
      procedureId: procMap.get("infrastructure_loss")!,
      testDate: new Date("2025-12-15"),
      outcome: "pass",
      actualRecoveryMinutes: 165,
      notes: "Full DR site activation completed within RTO. All critical services verified operational.",
      gapsFound: null,
      remediationStatus: "resolved",
      conductedBy: "Robert Kim, CTO",
    },
  ]);

  await db.insert(drBusinessImpactTable).values([
    { systemName: "Transaction Processing Engine", description: "Core payment and transaction processing system handling all financial operations.", criticality: "critical", maxDowntimeMinutes: 15, financialImpactPerHour: 125000, dependencies: "Database, API Gateway, Payment Providers", currentStatus: "operational", lastAssessedAt: new Date("2026-03-10") },
    { systemName: "Authentication & Identity Service", description: "User authentication, SSO, and identity management for all platform access.", criticality: "critical", maxDowntimeMinutes: 10, financialImpactPerHour: 85000, dependencies: "Database, Redis Cache, LDAP", currentStatus: "operational", lastAssessedAt: new Date("2026-03-10") },
    { systemName: "Security Monitoring Platform", description: "Real-time security monitoring, threat detection, and alerting system.", criticality: "critical", maxDowntimeMinutes: 5, financialImpactPerHour: 200000, dependencies: "SIEM, Log Aggregator, Alert Engine", currentStatus: "operational", lastAssessedAt: new Date("2026-03-10") },
    { systemName: "Email Security Gateway", description: "Email filtering, phishing detection, and secure email routing.", criticality: "high", maxDowntimeMinutes: 30, financialImpactPerHour: 45000, dependencies: "Mail Servers, Threat Intelligence Feed, DNS", currentStatus: "operational", lastAssessedAt: new Date("2026-03-08") },
    { systemName: "API Gateway", description: "Central API gateway handling all external and internal API traffic.", criticality: "critical", maxDowntimeMinutes: 10, financialImpactPerHour: 95000, dependencies: "Load Balancer, SSL Certificates, Rate Limiter", currentStatus: "operational", lastAssessedAt: new Date("2026-03-10") },
    { systemName: "Data Warehouse & Analytics", description: "Business intelligence, reporting, and analytics platform.", criticality: "medium", maxDowntimeMinutes: 120, financialImpactPerHour: 15000, dependencies: "ETL Pipeline, Database Replicas, BI Tools", currentStatus: "operational", lastAssessedAt: new Date("2026-03-05") },
    { systemName: "Customer Communication Platform", description: "Customer notification, email, SMS, and in-app messaging system.", criticality: "high", maxDowntimeMinutes: 60, financialImpactPerHour: 30000, dependencies: "Message Queue, Email Provider, SMS Gateway", currentStatus: "operational", lastAssessedAt: new Date("2026-03-07") },
    { systemName: "Backup & Recovery Infrastructure", description: "Automated backup, replication, and point-in-time recovery systems.", criticality: "high", maxDowntimeMinutes: 30, financialImpactPerHour: 50000, dependencies: "Storage Arrays, Replication Agents, Offsite Storage", currentStatus: "operational", lastAssessedAt: new Date("2026-03-09") },
  ]);

  await db.insert(drFailoverConfigTable).values([
    { component: "Primary Database", primaryStatus: "healthy", secondaryStatus: "standby", failoverMode: "automatic", lastHealthCheckAt: new Date("2026-03-18T08:00:00"), rtoSeconds: 30, isActive: true },
    { component: "Application Servers", primaryStatus: "healthy", secondaryStatus: "standby", failoverMode: "automatic", lastHealthCheckAt: new Date("2026-03-18T08:00:00"), rtoSeconds: 60, isActive: true },
    { component: "API Gateway", primaryStatus: "healthy", secondaryStatus: "standby", failoverMode: "automatic", lastHealthCheckAt: new Date("2026-03-18T08:00:00"), rtoSeconds: 15, isActive: true },
    { component: "Load Balancer", primaryStatus: "healthy", secondaryStatus: "syncing", failoverMode: "automatic", lastHealthCheckAt: new Date("2026-03-18T07:55:00"), rtoSeconds: 10, isActive: true },
    { component: "DNS Service", primaryStatus: "healthy", secondaryStatus: "active", failoverMode: "automatic", lastHealthCheckAt: new Date("2026-03-18T08:00:00"), rtoSeconds: 5, isActive: true },
    { component: "Email Gateway", primaryStatus: "healthy", secondaryStatus: "standby", failoverMode: "manual", lastHealthCheckAt: new Date("2026-03-18T07:50:00"), rtoSeconds: 120, isActive: true },
    { component: "Security Monitoring", primaryStatus: "healthy", secondaryStatus: "standby", failoverMode: "hybrid", lastHealthCheckAt: new Date("2026-03-18T08:00:00"), rtoSeconds: 45, isActive: true },
    { component: "Backup Storage", primaryStatus: "healthy", secondaryStatus: "syncing", failoverMode: "manual", lastHealthCheckAt: new Date("2026-03-18T07:45:00"), rtoSeconds: 300, isActive: true },
  ]);

  await db.insert(drCommunicationPlanTable).values([
    { scenario: "Critical System Outage", escalationLevel: 1, contactName: "Marcus Johnson", contactRole: "DevOps Lead", contactEmail: "m.johnson@guardianlayer.com", contactPhone: "+1-555-0101", notificationTemplate: "URGENT: Critical system outage detected in {system}. Estimated impact: {impact}. Please join the incident bridge immediately.", responseTimeMinutes: 5 },
    { scenario: "Critical System Outage", escalationLevel: 2, contactName: "Robert Kim", contactRole: "CTO", contactEmail: "r.kim@guardianlayer.com", contactPhone: "+1-555-0102", notificationTemplate: "ESCALATION: Critical outage in {system} unresolved after {duration}. Business impact: ${impactPerHour}/hr. Executive decision needed.", responseTimeMinutes: 15 },
    { scenario: "Security Breach", escalationLevel: 1, contactName: "Diana Park", contactRole: "CISO", contactEmail: "d.park@guardianlayer.com", contactPhone: "+1-555-0201", notificationTemplate: "SECURITY INCIDENT: Confirmed breach detected. Attack vector: {vector}. Affected systems: {systems}. Initiating incident response protocol.", responseTimeMinutes: 5 },
    { scenario: "Security Breach", escalationLevel: 2, contactName: "Jennifer Walsh", contactRole: "Legal Counsel", contactEmail: "j.walsh@guardianlayer.com", contactPhone: "+1-555-0202", notificationTemplate: "LEGAL NOTIFICATION: Security breach confirmed. Potential data exposure: {dataTypes}. Regulatory notification timeline: {deadline}.", responseTimeMinutes: 30 },
    { scenario: "Security Breach", escalationLevel: 3, contactName: "Michael Torres", contactRole: "CEO", contactEmail: "m.torres@guardianlayer.com", contactPhone: "+1-555-0203", notificationTemplate: "EXECUTIVE BRIEFING: Security incident requiring board notification. Scope: {scope}. Customer impact: {customerCount} users. Media strategy needed.", responseTimeMinutes: 60 },
    { scenario: "Ransomware Attack", escalationLevel: 1, contactName: "Diana Park", contactRole: "CISO", contactEmail: "d.park@guardianlayer.com", contactPhone: "+1-555-0201", notificationTemplate: "CRITICAL: Ransomware detected. All systems being isolated. DO NOT pay ransom. Preserve all evidence. Join emergency bridge.", responseTimeMinutes: 5 },
    { scenario: "Ransomware Attack", escalationLevel: 2, contactName: "FBI Cyber Division", contactRole: "Law Enforcement", contactEmail: "ic3@fbi.gov", contactPhone: "+1-800-CALL-FBI", notificationTemplate: "FBI REPORT: Ransomware incident at GuardianLayer. Variant: {variant}. Systems affected: {count}. Evidence preserved. Request investigation support.", responseTimeMinutes: 60 },
    { scenario: "Data Center Loss", escalationLevel: 1, contactName: "Alex Rivera", contactRole: "Infrastructure Lead", contactEmail: "a.rivera@guardianlayer.com", contactPhone: "+1-555-0301", notificationTemplate: "DR ACTIVATION: Primary data center {location} is offline. Activating DR site. ETA to partial service: {eta}.", responseTimeMinutes: 5 },
    { scenario: "Data Center Loss", escalationLevel: 2, contactName: "Lisa Chang", contactRole: "Communications Director", contactEmail: "l.chang@guardianlayer.com", contactPhone: "+1-555-0302", notificationTemplate: "CUSTOMER NOTICE: Service disruption due to infrastructure event. Teams actively restoring service. Next update in {interval}.", responseTimeMinutes: 30 },
  ]);

  await db.insert(drComplianceChecklistTable).values([
    { framework: "SOC 2", controlId: "CC6.1", controlTitle: "Logical and Physical Access Controls", description: "The entity implements logical access security software, infrastructure, and architectures to protect information assets.", status: "compliant", evidence: "Access control policies documented. MFA enforced for all admin access. Quarterly access reviews conducted.", lastReviewedAt: new Date("2026-03-01"), assignedTo: "Diana Park" },
    { framework: "SOC 2", controlId: "CC7.2", controlTitle: "System Monitoring", description: "The entity monitors system components and the operation of those components for anomalies.", status: "compliant", evidence: "24/7 monitoring via GuardianLayer platform. Alert escalation procedures in place. Monthly monitoring reports reviewed.", lastReviewedAt: new Date("2026-03-01"), assignedTo: "Marcus Johnson" },
    { framework: "SOC 2", controlId: "CC7.3", controlTitle: "Incident Response", description: "The entity evaluates security events to determine whether they constitute security incidents.", status: "compliant", evidence: "Incident response plan documented and tested quarterly. Last tabletop exercise: Feb 2026.", lastReviewedAt: new Date("2026-02-28"), assignedTo: "Diana Park" },
    { framework: "SOC 2", controlId: "CC7.4", controlTitle: "Incident Recovery", description: "The entity responds to identified security incidents by implementing documented procedures.", status: "compliant", evidence: "DR procedures documented for all critical scenarios. Recovery tested bi-monthly.", lastReviewedAt: new Date("2026-03-01"), assignedTo: "Robert Kim" },
    { framework: "SOC 2", controlId: "CC9.1", controlTitle: "Risk Mitigation", description: "The entity identifies, selects, and develops risk mitigation activities.", status: "in_progress", evidence: "Risk register updated quarterly. Some mitigation activities pending implementation.", lastReviewedAt: new Date("2026-02-15"), assignedTo: "Diana Park" },

    { framework: "ISO 27001", controlId: "A.17.1.1", controlTitle: "Planning Information Security Continuity", description: "The organization shall determine its requirements for information security and business continuity management.", status: "compliant", evidence: "Business continuity plan documented. Information security continuity requirements defined.", lastReviewedAt: new Date("2026-03-05"), assignedTo: "Robert Kim" },
    { framework: "ISO 27001", controlId: "A.17.1.2", controlTitle: "Implementing Information Security Continuity", description: "The organization shall establish, document, implement and maintain processes and controls.", status: "compliant", evidence: "DR procedures implemented for all critical scenarios. Failover systems configured and tested.", lastReviewedAt: new Date("2026-03-05"), assignedTo: "Marcus Johnson" },
    { framework: "ISO 27001", controlId: "A.17.1.3", controlTitle: "Verify and Review Continuity", description: "The organization shall verify the established and implemented controls at regular intervals.", status: "in_progress", evidence: "Quarterly DR tests conducted. Some scenarios not yet tested in current quarter.", lastReviewedAt: new Date("2026-02-15"), assignedTo: "Sarah Chen" },
    { framework: "ISO 27001", controlId: "A.17.2.1", controlTitle: "Availability of Information Processing", description: "Information processing facilities shall be implemented with redundancy sufficient to meet availability requirements.", status: "compliant", evidence: "Redundant systems deployed for all critical components. Automatic failover configured.", lastReviewedAt: new Date("2026-03-05"), assignedTo: "Alex Rivera" },
    { framework: "ISO 27001", controlId: "A.12.3.1", controlTitle: "Information Backup", description: "Backup copies of information, software and system images shall be taken and tested regularly.", status: "compliant", evidence: "Daily automated backups. Weekly backup restoration tests. Air-gapped offsite copies maintained.", lastReviewedAt: new Date("2026-03-10"), assignedTo: "Sarah Chen" },

    { framework: "NIST CSF", controlId: "PR.IP-9", controlTitle: "Response and Recovery Plans", description: "Response plans and recovery plans are in place and managed.", status: "compliant", evidence: "Comprehensive DR plan covering 7 scenarios. Tested quarterly. Results documented and gaps tracked.", lastReviewedAt: new Date("2026-03-01"), assignedTo: "Diana Park" },
    { framework: "NIST CSF", controlId: "PR.IP-10", controlTitle: "Response and Recovery Plans Testing", description: "Response and recovery plans are tested.", status: "in_progress", evidence: "5 of 7 procedures tested in last quarter. Data corruption scenario pending test.", lastReviewedAt: new Date("2026-03-01"), assignedTo: "Marcus Johnson" },
    { framework: "NIST CSF", controlId: "RC.RP-1", controlTitle: "Recovery Plan Execution", description: "Recovery plan is executed during or after a cybersecurity incident.", status: "compliant", evidence: "Recovery procedures documented with step-by-step runbooks. Personnel trained and certified.", lastReviewedAt: new Date("2026-03-05"), assignedTo: "Robert Kim" },
    { framework: "NIST CSF", controlId: "RC.IM-1", controlTitle: "Recovery Improvements", description: "Recovery plans incorporate lessons learned.", status: "compliant", evidence: "Post-incident reviews conducted after every DR test. Improvements tracked in remediation log.", lastReviewedAt: new Date("2026-03-05"), assignedTo: "Diana Park" },
    { framework: "NIST CSF", controlId: "RC.CO-3", controlTitle: "Recovery Communication", description: "Recovery activities are communicated to internal and external stakeholders.", status: "non_compliant", evidence: null, lastReviewedAt: null, assignedTo: "Lisa Chang" },
  ]);

  console.log("Disaster recovery seed data complete.");
}
