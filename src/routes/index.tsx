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
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[120vh]">
        <StarField />
      </div>

      <div className="relative z-10">
        <SiteHeader />

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-28 sm:pt-32">
          <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-12 lg:gap-16">
            <div>
              <Reveal>
                <p className="label-mono font-display text-xs font-medium tracking-[0.2em] sm:text-sm">
                  밤하늘을 기록하는 <span className="text-primary">관측자들</span>
                </p>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="mt-6 font-display text-7xl leading-[1] font-bold sm:text-9xl">
                  YAAA
                </h1>
                <p className="mt-4 font-display text-base font-semibold tracking-tight sm:text-lg">
                  Yonsei Amateur Astronomy Association · Est. 1985
                </p>
              </Reveal>


              <Reveal delay={160}>
                <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground">
                  YAAA는 연세대학교 중앙동아리로, 전공과 학년에 관계없이 모인 부원들이 함께 별을
                  관측하고 기록합니다. 이 공간은 부원들의 공지와 소통을 위한 전용 페이지입니다.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-12 flex flex-wrap gap-3">
                  <Link
                    to="/auth"
                    className="glow-cyan rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    부원 로그인 / 가입
                  </Link>
                  <a
                    href="#faq"
                    className="rounded-sm border border-border px-6 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    자주 묻는 질문
                  </a>
                </div>
              </Reveal>
            </div>

            <Reveal delay={200}>
              <div className="mx-auto aspect-square w-full max-w-xs sm:max-w-sm md:-mt-16 md:max-w-none lg:-mt-24">
                <ConstellationArt />
              </div>
            </Reveal>
          </div>

          <Reveal delay={320}>
            <dl className="mt-24 grid gap-3 sm:grid-cols-3">
              {FACTS.map((f) => (
                <div
                  key={f.label}
                  className="dashed-card flex min-h-36 flex-col justify-center rounded-lg bg-background/70 px-6 py-7 backdrop-blur-sm"
                >

                  <dt className="label-mono">{f.label}</dt>
                  <dd className="mt-2.5 font-display text-2xl leading-tight font-semibold">
                    {f.value}
                  </dd>
                  <dd className="mt-2.5 font-mono text-xs text-muted-foreground">{f.sub}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        {/* About */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-28">
            <Reveal>
              <p className="label-mono">01 — About</p>
            </Reveal>
            <div className="mt-10 grid gap-16 lg:grid-cols-[1fr_1.1fr]">
              <Reveal>
                <h2 className="text-3xl leading-tight font-semibold sm:text-4xl">
                  관측에 필요한 건 전공이 아니라,
                  <br />
                  하늘을 향한 호기심입니다.
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <div className="space-y-8">
                  <p className="leading-relaxed text-muted-foreground">
                    1985년 창립 이래 YAAA는 캠퍼스와 교외 관측지를 오가며 성운·성단·행성 관측과
                    천체사진 촬영을 이어오고 있습니다. 대형 중앙동아리답게 매 학기 신입 부원을
                    맞이하며, 전공·학년의 경계 없이 함께 장비를 다루고 기록을 남깁니다.
                  </p>
                  <ul className="grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: Telescope, t: "정기 관측", d: "교내·교외 관측회" },
                      { icon: Users, t: "부원 교육", d: "장비 · 성도 기초" },
                      { icon: CalendarDays, t: "세미나", d: "천체물리 스터디" },
                    ].map(({ icon: Icon, t, d }) => (
                      <li key={t} className="dashed-card rounded-lg bg-card px-5 py-6">

                        <Icon className="h-4 w-4 text-gold" strokeWidth={1.5} />
                        <p className="mt-4 text-sm font-medium">{t}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{d}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-28">
            <Reveal>
              <p className="label-mono">02 — Clubroom</p>
            </Reveal>
            <div className="mt-10 grid gap-12 lg:grid-cols-2">
              <Reveal>
                <h2 className="text-3xl font-semibold sm:text-4xl">동아리방 안내</h2>
                <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
                  학기 중 평일 상시 개방됩니다. 관측 장비 대여와 반납, 정기 모임이 이곳에서
                  이루어집니다.
                </p>
              </Reveal>
              <Reveal delay={120}>
                <div className="hairline rounded-lg bg-card/60 p-8">
                  <MapPin className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  <dl className="mt-8 space-y-6 font-mono text-sm">
                    {[
                      ["LOCATION", "연세대학교 신촌캠퍼스 학생회관"],
                      ["ROOM", "동아리방 (YAAA)"],
                      ["OPEN", "학기 중 평일 상시"],
                      ["CONTACT", "인스타그램 DM"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-6 border-b border-border/60 pb-4">
                        <dt className="label-mono w-28 shrink-0">{k}</dt>
                        <dd className="text-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                    정확한 호실과 개방 시간은 운영진 공지를 따릅니다.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-28">
            <Reveal>
              <p className="label-mono">03 — FAQ</p>
              <h2 className="mt-8 text-3xl font-semibold sm:text-4xl">자주 묻는 질문</h2>
            </Reveal>
            <Reveal delay={100}>
              <Accordion type="single" collapsible className="mt-12 border-t border-border">
                {FAQ.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`item-${i}`}
                    className="border-b border-border"
                  >
                    <AccordionTrigger className="gap-6 py-6 text-left text-base hover:no-underline">
                      <span className="flex gap-6">
                        <span className="font-mono text-xs text-primary">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {item.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 pl-[3.25rem] text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* Social + footer */}
        <footer className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Reveal>
              <p className="label-mono">04 — Channels</p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <a
                  href="https://instagram.com/yaaa_yonsei"
                  target="_blank"
                  rel="noreferrer"
                  className="hairline inline-flex items-center gap-3 rounded-sm px-5 py-3 text-sm transition-colors hover:border-gold/50 hover:text-gold"
                >
                  <Instagram className="h-4 w-4" strokeWidth={1.5} />
                  Instagram
                  <span className="font-mono text-xs text-muted-foreground">@yaaa_yonsei</span>
                </a>
              </div>
            </Reveal>

            <div className="mt-20 flex flex-wrap items-end justify-between gap-6 border-t border-border pt-8">
              <p className="font-display text-3xl font-bold tracking-[0.2em] text-muted-foreground/40">
                YAAA
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                연세 아마추어 천문회 · Yonsei University · Since 1985
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
