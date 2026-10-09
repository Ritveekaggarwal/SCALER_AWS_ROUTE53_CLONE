import type { SideNavigationProps } from "@cloudscape-design/components/side-navigation";

export const PLACEHOLDERS: Record<string, string> = {
  "/profiles": "Profiles",
  "/cidrcollections": "CIDR collections",
  "/trafficpolicies": "Traffic policies",
  "/policyrecords": "Policy records",
  "/domains": "Registered domains",
  "/domains/requests": "Requests",
  "/resolver/vpcs": "VPCs",
  "/resolver/inbound-endpoints": "Inbound endpoints",
  "/resolver/outbound-endpoints": "Outbound endpoints",
  "/resolver/rules": "Rules",
  "/resolver/query-logging": "Query logging",
  "/firewall/rule-groups": "Rule groups",
  "/firewall/domain-lists": "Domain lists",
};

const link = (href: string, text = PLACEHOLDERS[href]): SideNavigationProps.Link => ({ type: "link", text, href });

export const NAV_ITEMS: SideNavigationProps.Item[] = [
  link("/dashboard", "Dashboard"),
  link("/hostedzones", "Hosted zones"),
  link("/healthchecks", "Health checks"),
  link("/profiles"),
  { type: "section", text: "IP-based routing", items: [link("/cidrcollections")] },
  { type: "section", text: "Traffic flow", items: [link("/trafficpolicies"), link("/policyrecords")] },
  { type: "section", text: "Domains", items: [link("/domains"), link("/domains/requests")] },
  {
    type: "section",
    text: "Resolver",
    items: [
      link("/resolver/vpcs"),
      link("/resolver/inbound-endpoints"),
      link("/resolver/outbound-endpoints"),
      link("/resolver/rules"),
      link("/resolver/query-logging"),
    ],
  },
  { type: "section", text: "DNS Firewall", items: [link("/firewall/rule-groups"), link("/firewall/domain-lists")] },
];
