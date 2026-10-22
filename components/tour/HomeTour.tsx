"use client";

import { useMemo } from "react";
import { Tour, useTour, type TourStep } from "./Tour";

export function HomeTour({ seen, isAdmin }: { seen: boolean; isAdmin: boolean }) {
  const tour = useTour("home", seen);
  const steps = useMemo<TourStep[]>(
    () => [
      {
        title: "أهلاً بك في جُملة 👋",
        body: "هنا تتعلّم الإنجليزية بأنك تسمع الجملة وتكتبها حرفاً بحرف. خلّنا نعرّفك على الموقع في أقل من دقيقة، وتقدر تتخطى الجولة في أي وقت.",
      },
      {
        target: ['[data-tour="nav"]', '[data-tour="nav-mobile"]'],
        title: "الأقسام",
        body: "القصص: قصص قصيرة تكتبها جملة جملة. النصوص: تسمع وتكتب ثم تجاوب أسئلة فهم. الكلمات: مفردات حسب المستوى. الترتيب: تنافس أصحابك على النقاط.",
      },
      {
        target: ['[data-tour="next-up"]'],
        title: "التالي لك",
        body: "من هنا تكمل آخر درس وقفت فيه، أو تبدأ درساً جديداً.",
      },
      {
        target: ['[data-tour="missions"]'],
        title: "مهام اليوم",
        body: "ثلاث مهام تتجدد كل يوم. لما تخلص مهمة تاخذ نقاطها تلقائياً.",
      },
      {
        target: ['[data-tour="badges"]'],
        title: "الستريك والنقاط",
        body: "🔥 عدد الأيام المتتالية اللي تدرّبت فيها. ❄ تجميد يحمي الستريك إذا فاتك يوم، وتكسب واحداً كل 7 أيام. ⭐ مجموع نقاطك.",
      },
      {
        target: ['[data-tour="stats"]'],
        title: "إحصائياتك",
        body: "الكلمات والجمل اللي كتبتها، وعدد الدروس اللي أنهيتها، وأطول ستريك وصلت له.",
      },
      {
        target: ['[data-tour="sync"]'],
        optional: true,
        title: "الحفظ",
        body: "«محفوظ» يعني تقدّمك وصل للخادم. إذا انقطع الإنترنت يتحفظ على جهازك ويُرسل لحاله لما يرجع، فما يضيع شيء.",
      },
      {
        target: ['[data-tour="account"]', '[data-tour="account-mobile"]'],
        title: "حسابك",
        body: "من هنا تغيّر اسمك أو إيميلك أو كلمة المرور، وتقدر تعيد هذي الجولة في أي وقت.",
      },
      ...(isAdmin
        ? [
            {
              target: ['[data-tour="admin"]', '[data-tour="admin-mobile"]'],
              optional: true,
              title: "لوحة المدير",
              body: "تظهر لك أنت فقط: تعدّل الدروس والترجمات، وتضيف دروساً جديدة، وتقرأ بلاغات الأخطاء من أصحابك.",
            },
          ]
        : []),
      {
        title: "جاهز؟ ✍️",
        body: "ابدأ بأول قصة. أول ما تدخل الدرس بنشرح لك شاشته في جولة قصيرة.",
      },
    ],
    [isAdmin],
  );
  return <Tour steps={steps} open={tour.open} onClose={tour.close} />;
}
