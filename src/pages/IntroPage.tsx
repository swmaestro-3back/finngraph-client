import { ButtonLink } from "@/components/fg/Button";
import { useAuth } from "@/lib/auth";
import { features } from "@/lib/features";
import NoisyNewsFigure from "./intro/NoisyNewsFigure";

const START = { authenticated: "/", other: "/signup" } as const;
const GRAPH = "/graph";

export default function IntroPage() {
  const { status } = useAuth();
  const start = status === "authenticated" ? START.authenticated : START.other;
  const explore = features.ripple ? "/ripple" : GRAPH;

  return (
    <div className="fg-intro">
      {/* 히어로: 왼쪽 문구, 오른쪽에 그래프 캡처가 화면 끝까지 */}
      <header className="fg-intro__hero">
        <div className="fg-wrap fg-intro__hero-in">
          <div className="fg-intro__hero-copy">
            <h1 className="fg-intro__h1">
              뉴스는 다 봤는데,
              <br />왜 그 종목은 못 봤을까?
            </h1>
            <p className="fg-intro__lead">
              뉴스를 넘어 숨겨진 관계 속의 종목들을 발굴해보세요!
            </p>
            <div className="fg-intro__cta">
              <ButtonLink to={start} variant="primary" size="lg">
                시작하기
              </ButtonLink>
              <ButtonLink to={GRAPH} variant="tertiary" size="lg">
                기업 그래프 둘러보기
              </ButtonLink>
            </div>
          </div>
          <div className="fg-intro__hero-art">
            <div className="fg-intro__shot">
              <img
                src="/intro/graph-supplychain.png"
                alt="삼성SDI 공급망 그래프. 1단계, 2단계 동심원 위에 공급사와 고객사가 배치되어 있다"
                width={810}
                height={973}
                fetchPriority="high"
              />
            </div>
          </div>
        </div>
      </header>

      {/* 핵심 이슈: 기존 앱과 Finngraph를 크기로 대조 */}
      <section
        className="fg-intro__section"
        id="issues"
        aria-labelledby="intro-issues"
      >
        <div className="fg-wrap">
          <h2 id="intro-issues" className="fg-intro__h2 fg-intro__h2--section">
            진짜 주가를 움직이는 핵심 이슈들만 한 눈에!
          </h2>
          <div className="fg-intro__compare">
            <figure className="fg-intro__figure">
              <div className="fg-intro__shot fg-intro__shot--before">
                <NoisyNewsFigure />
              </div>
              <figcaption className="fg-intro__caption">
                종목 검색했더니 엉뚱한 뉴스가 반 이상인 경험, 있으시죠?
              </figcaption>
            </figure>
            <div className="fg-intro__vs" aria-hidden="true">
              VS
            </div>
            <figure className="fg-intro__figure">
              <div className="fg-intro__shot">
                <img
                  src="/intro/stock-news-issues.webp"
                  alt="SK하이닉스 뉴스·이슈 탭. 종목과 직접 연관된 이슈만 요약과 함께 나열된다"
                  width={870}
                  height={993}
                  loading="lazy"
                />
              </div>
              <figcaption className="fg-intro__caption">
                종목과 연관된 굵직한 이슈들만 추려보세요!
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 이슈 타임라인 */}
      <section
        className="fg-intro__section"
        id="timeline"
        aria-labelledby="intro-timeline"
      >
        <div className="fg-wrap fg-intro__row">
          <div className="fg-intro__text">
            <h2 id="intro-timeline" className="fg-intro__h2">
              꼬리에 꼬리를 무는 이슈들!
            </h2>
            <p className="fg-intro__desc">
              타임라인 순으로 이슈 전개 과정을 확인해보세요!
            </p>
            <ButtonLink to="/" variant="tertiary" className="fg-intro__more">
              이슈 타임라인 보기
            </ButtonLink>
          </div>
          <div className="fg-intro__art">
            <div className="fg-intro__shot">
              <img
                src="/intro/issue-timeline.webp"
                alt="한화 KAI 인수 독과점 국감 쟁점 이슈의 타임라인. 주가 차트 위에 보도일이 표시되고 보도 사이의 주가 변화가 적혀 있다"
                width={728}
                height={1000}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 관계 탐색 */}
      <section
        className="fg-intro__section"
        id="valuechain"
        aria-labelledby="intro-valuechain"
      >
        <div className="fg-wrap">
          <h2
            id="intro-valuechain"
            className="fg-intro__h2 fg-intro__h2--section"
          >
            관심 종목의 밸류체인을 한번에!
          </h2>
          <div className="fg-intro__row fg-intro__row--flip">
            <div className="fg-intro__art">
              <div className="fg-intro__shot">
                <img
                  src="/intro/graph-supplychain.png"
                  alt="삼성SDI 공급망 그래프. 간선을 클릭하면 공급 관계의 근거가 열린다"
                  width={810}
                  height={973}
                  loading="lazy"
                />
              </div>
            </div>
            <div className="fg-intro__text">
              <h3 className="fg-intro__h2">
                두세다리 건너에는
                <br />
                어떠한 종목이 있을까?
              </h3>
              <p className="fg-intro__desc">
                공급망을 탐색하며 숨겨진 알짜배기 종목들을 발굴해보세요!
              </p>
              <p className="fg-intro__desc">
                어떤 근거로 왜 연결되었는지 간선을 클릭하여 확인해보세요!
              </p>
              <ButtonLink
                to={GRAPH}
                variant="tertiary"
                className="fg-intro__more"
              >
                관계 탐색 해보기
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* 이슈에서 출발 */}
      <section
        className="fg-intro__section"
        id="from-issue"
        aria-labelledby="intro-from-issue"
      >
        <div className="fg-wrap">
          <h2
            id="intro-from-issue"
            className="fg-intro__h2 fg-intro__h2--section"
          >
            이슈와 얽힌 종목들을 한번에!
          </h2>
          <div className="fg-intro__row">
            <div className="fg-intro__text">
              <h3 className="fg-intro__h2">
                눈여겨보던 이슈에서 시작하여
                <br />
                꽁꽁 숨어있던 종목을 확인해보세요!
              </h3>
              <ButtonLink
                to={explore}
                variant="tertiary"
                className="fg-intro__more"
              >
                그래프 탐색 해보기
              </ButtonLink>
            </div>
            <div className="fg-intro__art fg-intro__stack">
              <div className="fg-intro__shot">
                <img
                  src="/intro/issue-linked-stocks.png"
                  alt="HD현대 HMM 친환경 컨테이너선 수주 이슈의 연결된 종목 27개 탭"
                  width={1175}
                  height={581}
                  loading="lazy"
                />
              </div>
              <div className="fg-intro__shot">
                <img
                  src="/intro/issue-relation-graph.png"
                  alt="이슈에서 뉴스에 나온 종목을 거쳐 이어진 기업까지 트리로 펼쳐지는 관계 그래프"
                  width={810}
                  height={471}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 마무리 + CTA */}
      <section className="fg-intro__closing" aria-labelledby="intro-start">
        <div className="fg-wrap">
          <h2 id="intro-start" className="fg-intro__h2">
            현재 아직 발굴되지 않은 수많은 종목들이
            <br />
            여러분을 기다리고 있어요.
          </h2>
          <p className="fg-intro__lead">
            뉴스를 넘어 숨겨진 관계 속의 종목들을 발굴해보세요!
          </p>
          <ButtonLink
            to={start}
            variant="primary"
            size="lg"
            className="fg-intro__closing-btn"
          >
            지금 바로 시작하기!
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
