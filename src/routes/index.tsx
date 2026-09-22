import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, Telescope, Users, CalendarDays } from "lucide-react";
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
  { label: "창립", value: "1985", sub: "올해로 41주년" },
  { label: "소속", value: "중앙동아리", sub: "연세대학교" },
  { label: "가입 대상", value: "전공 무관", sub: "학년도 무관, 누구나" },
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[90vh]">
        <StarField />
      </div>

      <div className="relative z-10">
        <SiteHeader />

        {/* Hero — 비대칭. 텍스트는 좁게 왼쪽, 라인아트는 오른쪽으로 흘려보냄 */}
        <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-14 sm:pt-28">
          <div className="pointer-events-none absolute top-8 -right-16 hidden w-[26rem] opacity-70 md:block lg:-right-24 lg:w-[32rem]">
            <ConstellationArt />
          </div>

          <Reveal>
            <div className="max-w-[34rem]">
              <p className="font-mono text-[0.7rem] tracking-[0.12em] text-muted-foreground">
                Yonsei Amateur Astronomy Association · est. 1985
              </p>
              <h1 className="mt-7 font-display text-[3.25rem] leading-[1.08] sm:text-[4.5rem]">
                밤하늘을 기록하는
                <br />
                <span className="text-primary">관측자들</span>
              </h1>
              <p className="mt-7 max-w-[30rem] text-[0.95rem] leading-[1.9] text-muted-foreground">
                YAAA는 연세대학교 중앙동아리로, 전공과 학년에 관계없이 모인 부원들이 함께 별을
                관측하고 기록합니다. 이 공간은 부원들의 공지와 소통을 위한 전용 페이지입니다.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link
                  to="/auth"
                  className="rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
                >
                  부원 로그인 / 가입
                </Link>
                <a
                  href="#faq"
                  className="border-b border-transparent pb-0.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  자주 묻는 질문
                </a>
              </div>
            </div>
          </Reveal>

          {/* 통계 — 카드가 아니라 얇은 구분선 위의 인라인 행 */}
          <dl className="mt-24 md:mt-32">
            {FACTS.map((f) => (
              <div
                key={f.label}
                className="flex flex-wrap items-baseline gap-x-8 gap-y-1 border-t border-border/70 py-6 sm:py-7"
              >
                <dt className="w-24 shrink-0 font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground/70">
                  {f.label}
                </dt>
                <dd className="font-display text-3xl leading-none sm:text-[2.75rem]">{f.value}</dd>
                <dd className="ml-auto font-mono text-xs text-muted-foreground">{f.sub}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 소개 — 보더 없이 여백으로만 구분, 오른쪽으로 밀린 본문 */}
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-16 sm:pt-32">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
            <h2 className="text-[1.5rem] leading-[1.45] sm:text-[1.9rem]">
              관측에 필요한 건 전공이 아니라,
              <br />
              하늘을 향한 호기심입니다.
            </h2>
            <div>
              <p className="max-w-[38rem] leading-[1.95] text-muted-foreground">
                1985년 창립 이래 YAAA는 캠퍼스와 교외 관측지를 오가며 성운·성단·행성 관측과
                천체사진 촬영을 이어오고 있습니다. 대형 중앙동아리답게 매 학기 신입 부원을 맞이하며,
                전공·학년의 경계 없이 함께 장비를 다루고 기록을 남깁니다.
              </p>
              <ul className="mt-12 flex flex-wrap gap-x-16 gap-y-8">
                {[
                  { icon: Telescope, t: "정기 관측", d: "교내 · 교외 관측회" },
                  { icon: Users, t: "부원 교육", d: "장비 · 성도 기초" },
                  { icon: CalendarDays, t: "세미나", d: "천체물리 스터디" },
                ].map(({ icon: Icon, t, d }) => (
                  <li key={t} className="flex items-start gap-3">
                    <Icon className="mt-1 h-4 w-4 text-gold" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium">{t}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 동아리방 — 타이트한 섹션. 제목이 표를 가로지르는 형태 */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-20">
          <div className="border-l border-primary/30 pl-6 sm:pl-10">
            <h2 className="text-[1.6rem] sm:text-[2rem]">동아리방</h2>
            <p className="mt-4 max-w-md text-sm leading-[1.9] text-muted-foreground">
              학기 중 평일 상시 개방됩니다. 관측 장비 대여와 반납, 정기 모임이 이곳에서
              이루어집니다.
            </p>
            <dl className="mt-10 max-w-2xl font-mono text-sm">
              {[
                ["위치", "연세대학교 신촌캠퍼스 학생회관"],
                ["호실", "동아리방 (YAAA)"],
                ["개방", "학기 중 평일 상시"],
                ["연락", "인스타그램 DM"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-8 border-b border-border/50 py-3.5">
                  <dt className="w-16 shrink-0 text-[0.7rem] tracking-[0.12em] text-muted-foreground/70">
                    {k}
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs text-muted-foreground">
              정확한 호실과 개방 시간은 운영진 공지를 따릅니다.
            </p>
          </div>
        </section>

        {/* FAQ — 넓은 섹션. 유일하게 헤어라인 구획을 쓰는 곳 */}
        <section id="faq" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 pt-24 pb-32 lg:grid-cols-[0.5fr_1.5fr] lg:gap-16">
            <div>
              <h2 className="text-[1.6rem] sm:text-[2rem]">자주 묻는 질문</h2>
              <p className="mt-4 font-mono text-xs text-muted-foreground">05 · faq</p>
            </div>
            <Accordion type="single" collapsible className="border-t border-border">
              {FAQ.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-b border-border">
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
          </div>
        </section>

        {/* 푸터 — 타이트 */}
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-8 px-6 py-14">
            <div>
              <p className="font-display text-2xl tracking-[0.18em] text-muted-foreground/40">
                YAAA
              </p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                연세 아마추어 천문회 · Yonsei University · since 1985
              </p>
            </div>
            <a
              href="https://instagram.com/yaaa_yonsei"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border-b border-border pb-1 text-sm transition-colors hover:border-gold/60 hover:text-gold"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.5} />
              Instagram
              <span className="font-mono text-xs text-muted-foreground">@yaaa_yonsei</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
