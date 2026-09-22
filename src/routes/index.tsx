import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, MapPin, Telescope, Users, CalendarDays } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site-header";
import { StarField } from "@/components/star-field";
import { Reveal } from "@/components/reveal";
import { ConstellationArt } from "@/components/constellation-art";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YAAA — 연세 아마추어 천문회 · 부원 전용" },
      {
        name: "description",
        content:
          "1985년부터 41년, 연세대학교 중앙동아리 YAAA(연세 아마추어 천문회)의 부원 전용 홈페이지. 공지·소통·관측 기록을 한 곳에서.",
      },
      { property: "og:title", content: "YAAA — 연세 아마추어 천문회" },
      {
        property: "og:description",
        content: "연세대학교 중앙 천체관측 동아리 YAAA 부원 전용 공간.",
      },
    ],
  }),
  component: Home,
});

const FACTS = [
  { label: "Founded", value: "1985", sub: "41주년" },
  { label: "Affiliation", value: "중앙동아리", sub: "연세대학교" },
  { label: "Open to", value: "전공·학년 무관", sub: "누구나" },
];

const FAQ = [
  {
    q: "천문학 전공이 아니어도 가입할 수 있나요?",
    a: "가능합니다. YAAA는 전공과 학년에 관계없이 누구나 가입할 수 있는 중앙동아리입니다. 실제로 인문·사회·공학 등 다양한 전공의 부원들이 함께 활동합니다.",
  },
  {
    q: "망원경을 다룰 줄 몰라도 괜찮나요?",
    a: "괜찮습니다. 신입 부원을 대상으로 기초 관측 교육을 진행하며, 동아리 보유 장비는 교육 이수 후 자유롭게 사용할 수 있습니다.",
  },
  {
    q: "홈페이지 가입은 어떻게 하나요?",
    a: "부원 명부에 등록된 이름과 학번으로 가입 신청 후 이메일 인증을 완료하면 자동으로 승인됩니다. 명부와 일치하지 않는 경우 운영진 승인 대기 상태로 접수됩니다.",
  },
  {
    q: "명부에 등록되어 있는데 인증이 되지 않습니다.",
    a: "이름의 띄어쓰기나 학번 오타를 먼저 확인해 주세요. 그래도 인증되지 않으면 승인 대기 상태로 접수되며, 운영진이 확인 후 수동으로 승인합니다.",
  },
  {
    q: "동아리방은 언제 이용할 수 있나요?",
    a: "학기 중에는 평일 상시 개방이며, 정기 모임과 관측 준비는 주로 저녁 시간에 이루어집니다. 방학 중 운영 시간은 공지를 통해 안내합니다.",
  },
];

function Home() {
  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[130vh]">
        <StarField />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,transparent_35%,var(--background)_100%)]" />
      </div>

      <div className="relative z-10">
        <SiteHeader />

        {/* Hero — wordmark first */}
        <section className="mx-auto max-w-[110rem] px-6 pt-16 sm:px-10 sm:pt-24">
          <Reveal>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <p className="label-mono">(01) Yonsei Amateur Astronomical Association</p>
              <p className="label-mono">Est. 1985 — Seoul</p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="wordmark mt-10 flex justify-between text-foreground select-none">
              {["Y", "A", "A", "A"].map((c, i) => (
                <span key={i} className={i === 3 ? "text-primary" : undefined}>
                  {c}
                </span>
              ))}
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <div className="mt-10 grid gap-10 border-t border-border pt-8 md:grid-cols-[1fr_auto] md:items-start">
              <div className="max-w-xl">
                <p className="font-display text-xl leading-snug font-medium sm:text-2xl">
                  밤하늘을 기록하는 관측자들.
                </p>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                  YAAA는 연세대학교 중앙동아리로, 전공과 학년에 관계없이 모인 부원들이 함께 별을
                  관측하고 기록합니다. 이 페이지는 부원들의 공지와 소통을 위한 전용 공간입니다.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-6">
                  <Link
                    to="/auth"
                    className="group inline-flex items-center gap-4 border-b border-primary/50 pb-1.5 text-sm text-primary"
                  >
                    부원 로그인 / 가입
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                  <a
                    href="#faq"
                    className="inline-flex items-center gap-4 border-b border-border pb-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    자주 묻는 질문
                  </a>
                </div>
              </div>

              <div className="hidden w-64 shrink-0 md:block lg:w-80">
                <ConstellationArt />
              </div>
            </div>
          </Reveal>
        </section>

        <div className="mt-20">
          <SkyTicker />
        </div>

        {/* Facts */}
        <section className="mx-auto max-w-[110rem] px-6 sm:px-10">
          <dl className="grid divide-border border-b border-border sm:grid-cols-3 sm:divide-x">
            {FACTS.map((f, i) => (
              <Reveal key={f.label} delay={i * 80}>
                <div className="flex min-h-40 flex-col justify-between px-1 py-9 sm:px-8">
                  <dt className="label-mono">
                    {String(i + 1).padStart(2, "0")} · {f.label}
                  </dt>
                  <div>
                    <dd className="font-display text-3xl leading-none font-semibold tracking-tight">
                      {f.value}
                    </dd>
                    <dd className="mt-3 font-mono text-xs text-muted-foreground">{f.sub}</dd>
                  </div>
                </div>
              </Reveal>
            ))}
          </dl>
        </section>

        {/* About */}
        <section className="mx-auto max-w-[110rem] px-6 py-32 sm:px-10">
          <div className="grid gap-14 lg:grid-cols-[18rem_1fr]">
            <Reveal>
              <p className="label-mono lg:sticky lg:top-28">(02) About</p>
            </Reveal>
            <div>
              <Reveal>
                <h2 className="max-w-3xl font-display text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.08] font-semibold tracking-tight">
                  관측에 필요한 건 전공이 아니라,
                  <br />
                  <span className="text-muted-foreground">하늘을 향한 호기심입니다.</span>
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-12 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  1985년 창립 이래 YAAA는 캠퍼스와 교외 관측지를 오가며 성운·성단·행성 관측과
                  천체사진 촬영을 이어오고 있습니다. 매 학기 신입 부원을 맞이하며, 전공·학년의 경계
                  없이 함께 장비를 다루고 기록을 남깁니다.
                </p>
              </Reveal>
              <Reveal delay={200}>
                <ul className="mt-16 divide-y divide-border border-y border-border">
                  {[
                    { icon: Telescope, t: "정기 관측", d: "교내 · 교외 관측회", n: "I" },
                    { icon: Users, t: "부원 교육", d: "장비 · 성도 기초", n: "II" },
                    { icon: CalendarDays, t: "세미나", d: "천체물리 스터디", n: "III" },
                  ].map(({ icon: Icon, t, d, n }) => (
                    <li
                      key={t}
                      className="group flex items-center gap-6 py-7 transition-colors hover:text-primary"
                    >
                      <span className="w-8 font-mono text-xs text-muted-foreground">{n}</span>
                      <Icon
                        className="h-4 w-4 text-gold transition-transform group-hover:-translate-y-0.5"
                        strokeWidth={1.5}
                      />
                      <span className="font-display text-xl font-medium tracking-tight">{t}</span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">{d}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Clubroom */}
        <section className="mx-auto max-w-[110rem] px-6 pb-32 sm:px-10">
          <div className="grid gap-14 lg:grid-cols-[18rem_1fr]">
            <Reveal>
              <p className="label-mono lg:sticky lg:top-28">(03) Clubroom</p>
            </Reveal>
            <div className="grid gap-12 lg:grid-cols-2">
              <Reveal>
                <h2 className="font-display text-[clamp(1.7rem,3vw,2.6rem)] leading-tight font-semibold tracking-tight">
                  동아리방 안내
                </h2>
                <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
                  학기 중 평일 상시 개방됩니다. 관측 장비 대여와 반납, 정기 모임이 이곳에서
                  이루어집니다.
                </p>
                <MapPin className="mt-10 h-5 w-5 text-primary" strokeWidth={1.5} />
              </Reveal>
              <Reveal delay={120}>
                <dl className="divide-y divide-border border-t border-border font-mono text-sm">
                  {[
                    ["LOCATION", "연세대학교 신촌캠퍼스 학생회관"],
                    ["ROOM", "동아리방 (YAAA)"],
                    ["OPEN", "학기 중 평일 상시"],
                    ["CONTACT", "인스타그램 DM"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-6 py-5">
                      <dt className="label-mono w-28 shrink-0">{k}</dt>
                      <dd className="text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                  정확한 호실과 개방 시간은 운영진 공지를 따릅니다.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-[110rem] scroll-mt-24 px-6 pb-32 sm:px-10">
          <div className="grid gap-14 lg:grid-cols-[18rem_1fr]">
            <Reveal>
              <p className="label-mono lg:sticky lg:top-28">(04) FAQ</p>
            </Reveal>
            <Reveal delay={100}>
              <Accordion type="single" collapsible className="border-t border-border">
                {FAQ.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`item-${i}`}
                    className="border-b border-border"
                  >
                    <AccordionTrigger className="gap-6 py-7 text-left text-base hover:no-underline data-[state=open]:text-primary">
                      <span className="flex gap-6">
                        <span className="font-mono text-xs text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {item.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-7 pl-[3.25rem] text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="mx-auto max-w-[110rem] px-6 py-20 sm:px-10">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-6">
                <p className="label-mono">(05) Channels</p>
                <div className="flex flex-wrap items-center gap-8">
                  <a
                    href="https://instagram.com/yaaa_yonsei"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-3 border-b border-border pb-1.5 text-sm transition-colors hover:border-gold/60 hover:text-gold"
                  >
                    <Instagram className="h-4 w-4" strokeWidth={1.5} />
                    Instagram
                    <span className="font-mono text-xs text-muted-foreground">@yaaa_yonsei</span>
                  </a>
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-3 border-b border-primary/50 pb-1.5 text-sm text-primary"
                  >
                    부원 전용 공간 →
                  </Link>
                </div>
              </div>
            </Reveal>

            <p className="wordmark mt-20 flex justify-between text-muted-foreground/15 select-none">
              {["Y", "A", "A", "A"].map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </p>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-7">
              <p className="font-mono text-xs text-muted-foreground">
                연세 아마추어 천문회 · Yonsei University
              </p>
              <p className="font-mono text-xs text-muted-foreground">Since 1985</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
