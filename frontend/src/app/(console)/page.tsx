"use client";

import Link from "next/link";
import ConsoleLayout from "@/components/console-layout";
import {
  DomainNamesArt,
  HealthChecksArt,
  HostedZonesArt,
  ResolverArt,
  TrafficFlowArt,
  VideoArt,
} from "@/components/landing-art";
import { ExternalIcon } from "@/components/shell/icons";
import s from "./landing.module.css";

const PRODUCTS = [
  {
    art: <DomainNamesArt />,
    title: "Domain names",
    text: "A domain is the name, such as example.com, that your users use to access your application. Register a new domain or transfer an existing one to Route 53.",
    href: "/domains",
  },
  {
    art: <HostedZonesArt />,
    title: "Hosted zones",
    text: "A hosted zone is a container for DNS records, which include information about how to route traffic for a domain such as example.com and all of its subdomains.",
    href: "/hostedzones",
  },
  {
    art: <HealthChecksArt />,
    title: "Health checks",
    text: "Health checks monitor your applications and web resources, and direct DNS queries to healthy resources.",
    href: "/healthchecks",
  },
  {
    art: <TrafficFlowArt />,
    title: "Traffic flow",
    text: "Easily create sophisticated routing configurations for your resources using the traffic flow visual tool.",
    href: "/trafficpolicies",
  },
  {
    art: <ResolverArt />,
    title: "Resolver",
    text: "Resolve DNS queries between your VPCs and your on-premises network, and filter outbound DNS traffic with DNS Firewall.",
    href: "/resolver/vpcs",
  },
];

const BENEFITS = [
  {
    title: "Highly available and reliable",
    text: "Route 53 is built using AWS's highly available and reliable infrastructure. The distributed nature of the DNS servers helps ensure a consistent ability to route your end users to your application.",
  },
  {
    title: "Designed for use with other AWS services",
    text: "Route 53 is designed to work well with other AWS features and offerings. You can use Route 53 to map domain names to your Amazon EC2 instances, Amazon S3 buckets, Amazon CloudFront distributions, and other AWS resources.",
  },
  {
    title: "Simple",
    text: "With self-service sign-up, Route 53 can start to answer your DNS queries within minutes. You can configure DNS settings for your domain in the console, the CloudShell CLI, or the API.",
  },
  {
    title: "Flexible",
    text: "Route 53 offers different routing policies and health checks so you can route traffic based on multiple criteria, such as endpoint health, geographic location, and latency.",
  },
];

const USE_CASES = [
  {
    title: "Global traffic management",
    text: "Route users to the closest or best performing endpoint, and fail over automatically when a health check reports an endpoint as unhealthy.",
  },
  {
    title: "Alias to AWS resources",
    text: "Point your zone apex at load balancers, CloudFront distributions and S3 website endpoints without CNAME restrictions.",
  },
  {
    title: "Private DNS for VPCs",
    text: "Use private hosted zones to give internal names to resources inside your VPCs that are never exposed to the internet.",
  },
  {
    title: "Hybrid cloud DNS",
    text: "Forward queries between your on-premises DNS and AWS with Resolver endpoints and rules.",
  },
];

const RESOURCES = [
  ["Documentation", "https://docs.aws.amazon.com/route53/"],
  ["API reference", "https://docs.aws.amazon.com/Route53/latest/APIReference/"],
  ["FAQs", "https://aws.amazon.com/route53/faqs/"],
  ["Forum", "https://repost.aws/tags/TA4f8wkd1oR2qGOdXKWOy2bA/amazon-route-53"],
];

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className={s.link} href={href} target="_blank" rel="noreferrer">
      {children} <ExternalIcon />
    </a>
  );
}

function Landing() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <div className={s.inner}>
          <div>
            <div className={s.category}>Network &amp; Content Delivery</div>
            <h1 className={s.title}>Amazon Route 53</h1>
            <p className={s.subtitle}>A reliable way to route users to internet applications</p>
            <p className={s.lead}>
              Amazon Route 53 is a highly available and scalable Domain Name System (DNS) web service. It is designed to
              give developers and businesses an extremely reliable and cost-effective way to route end users to
              internet applications.
            </p>
          </div>
          <aside className={`${s.side} ${s.heroSide}`}>
            <div className={s.card}>
              <h2 className={s.cardTitle}>Get started with Route 53</h2>
              <p className={s.cardText}>
                Create a hosted zone to manage DNS records for your domain, then add health checks to monitor the
                endpoints those records point to.
              </p>
              <Link className={s.getStarted} href="/dashboard">
                Get started
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className={s.body}>
        <div className={s.inner}>
          <div className={s.main}>
            <h2 className={s.sectionTitle} style={{ marginTop: 72 }}>
              How it works
            </h2>
            <a className={s.video} href="https://www.youtube.com/watch?v=RGWgfhZByAI" target="_blank" rel="noreferrer">
              <VideoArt />
            </a>

            <h2 className={s.sectionTitle}>Products</h2>
            <div className={`${s.card} ${s.products}`}>
              {PRODUCTS.map((p) => (
                <ProductRow key={p.title} {...p} />
              ))}
            </div>

            <h2 className={s.sectionTitle}>Benefits and features</h2>
            <div className={`${s.card} ${s.grid2}`}>
              {BENEFITS.map((b) => (
                <div key={b.title}>
                  <h3 className={s.featureTitle}>{b.title}</h3>
                  <p className={s.featureText}>{b.text}</p>
                </div>
              ))}
            </div>

            <h2 className={s.sectionTitle}>Use cases</h2>
            <div className={`${s.card} ${s.grid2}`}>
              {USE_CASES.map((b) => (
                <div key={b.title}>
                  <h3 className={s.featureTitle}>{b.title}</h3>
                  <p className={s.featureText}>{b.text}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className={s.side} style={{ marginTop: 182 }}>
            <div className={s.card}>
              <h2 className={s.cardTitleSm}>
                Pricing <span style={{ fontWeight: 400, fontSize: 16 }}>(US)</span>
              </h2>
              <p className={s.featureText} style={{ marginBottom: 16 }}>
                With Route 53 you pay only for what you use: hosted zones, queries, health checks and domain names.
              </p>
              <Ext href="https://aws.amazon.com/route53/pricing/">View pricing</Ext>
            </div>
            <div className={s.card}>
              <h2 className={s.cardTitleSm}>More resources</h2>
              <ul className={s.resList}>
                {RESOURCES.map(([label, href]) => (
                  <li key={label}>
                    <Ext href={href}>{label}</Ext>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function ProductRow({ art, title, text, href }: (typeof PRODUCTS)[number]) {
  return (
    <>
      <div className={s.art}>{art}</div>
      <div>
        <h3 className={s.featureTitle}>
          <Link className={s.link} style={{ fontSize: 21, fontWeight: 700 }} href={href}>
            {title}
          </Link>
        </h3>
        <p className={s.featureText}>{text}</p>
      </div>
    </>
  );
}

export default function HomePage() {
  return <ConsoleLayout navigationDefaultOpen={false} disableContentPaddings content={<Landing />} />;
}
