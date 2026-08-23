import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, Clock3, LockKeyhole, Menu, Plus, ShieldCheck, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { WebGLRenderer } from '@/components/webgl/WebGLRenderer';

const assessments = [
  { index: '01', title: 'Atenção & comportamento', description: 'Atenção, organização e impulsividade no dia a dia.' },
  { index: '02', title: 'Espectro autista', description: 'Comunicação, interação, rotina e processamento sensorial.' },
  { index: '03', title: 'Cognição', description: 'Raciocínio, padrões, memória e atenção.' },
  { index: '04', title: 'Altas habilidades', description: 'Características relacionadas a diferentes potenciais cognitivos.' },
];
const secondaryAssessments = assessments.slice(1);

const faqs = [
  ['A NURA faz diagnóstico?', 'Não. As experiências da NURA têm finalidade informativa e de autoconhecimento. Alguns instrumentos podem funcionar como triagem, mas nenhum resultado substitui uma avaliação ou diagnóstico profissional.'],
  ['Preciso pagar para começar?', 'Não. Você pode começar gratuitamente e receber um resultado inicial. Se quiser ir além, o relatório aprofundado custa R$ 19,90 em pagamento único, sem assinatura automática.'],
  ['Como meus dados são tratados?', 'Privacidade faz parte da experiência. Coletamos apenas o necessário para entregar seu resultado, com transparência sobre a finalidade e responsabilidade no tratamento dos dados.'],
  ['Quanto tempo leva uma avaliação?', 'Depende da experiência escolhida. A avaliação de TDAH em adultos, por exemplo, leva aproximadamente de 3 a 5 minutos.'],
];

function scrollToId(id: string, onDone?: () => void) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  onDone?.();
}

function MobileStickyCTA({ onStart }: { onStart: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Document height only changes on resize/layout. Reading it inside the
    // scroll handler forced a layout on every scroll frame.
    let docHeight = document.documentElement.scrollHeight;
    let winHeight = window.innerHeight;
    const measure = () => {
      docHeight = document.documentElement.scrollHeight;
      winHeight = window.innerHeight;
    };
    const handler = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > winHeight * 0.8 && scrollY < docHeight - winHeight * 1.5);
    };
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', measure);
    };
  }, []);
  return (
    <div className={`mobile-cta ${visible ? 'visible' : ''}`}>
      <button className="button button-primary button-wide" onClick={onStart}>Começar avaliação <ArrowRight size={16} /></button>
    </div>
  );
}

function NuraLogo({ light = true }: { light?: boolean }) {
  return <a className={`brand ${light ? '' : 'footer-brand'}`} href="#inicio" aria-label="NURA, voltar ao início"><span className="brand-mark" aria-hidden="true" />NURA</a>;
}

function Header({ onStart }: { onStart: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 28);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  const go = (id: string) => scrollToId(id, () => setOpen(false));
  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="wrap header-inner">
          <NuraLogo />
          <nav className="nav" aria-label="Navegação principal">
            <a href="#avaliacoes">Avaliações</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#perfil">NURA Perfil</a>
            <a href="#responsabilidade">Sobre</a>
          </nav>
          <div className="header-actions">
            <button className="header-login" onClick={() => window.dispatchEvent(new CustomEvent('nura:feedback', { detail: 'A área de acesso estará disponível em breve.' }))}>Entrar</button>
            <button className="button button-primary" onClick={onStart}>Começar <span className="desktop-only">grátis</span></button>
            <button className="menu-button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>
      {open && (
        <nav className="mobile-nav" aria-label="Navegação mobile">
          <a href="#avaliacoes" onClick={() => go('avaliacoes')}>Avaliações</a>
          <a href="#como-funciona" onClick={() => go('como-funciona')}>Como funciona</a>
          <a href="#perfil" onClick={() => go('perfil')}>NURA Perfil</a>
          <a href="#responsabilidade" onClick={() => go('responsabilidade')}>Sobre e privacidade</a>
        </nav>
      )}
    </>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="hero" id="inicio">
      <div className="hero-inner wrap">
        <div className="hero-content reveal">
          <div className="eyebrow eyebrow-light">Uma nova forma de se observar</div>
          <h1>Descubra mais<br /><span>sobre você.</span></h1>
          <p className="hero-sub">Explore diferentes dimensões da sua mente e comportamento.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={onStart}>Começar minha descoberta <ArrowRight size={16} /></button>
          </div>
          <div className="hero-meta"><span>Grátis para começar</span><i /><span>Resultado imediato</span><i /><span>Sem cartão</span></div>
        </div>
      </div>
      <div className="scroll-hint-wrapper wrap">
        <div className="scroll-hint"><span /> role para explorar</div>
      </div>
    </section>
  );
}

function Statement() {
  return (
    <section className="statement dark">
      <div className="wrap statement-inner reveal">
        <h2>Você é mais do que um <em>único resultado.</em></h2>
        <p className="statement-copy">Cada avaliação revela uma nova dimensão sobre como você pensa, sente, decide e interage. A NURA conecta essas descobertas sem reduzir quem você é a uma nota.</p>
      </div>
    </section>
  );
}

function AssessmentPaths({ onAssessment }: { onAssessment: (name: string) => void }) {
  return (
    <section className="section paths" id="avaliacoes">
      <div className="wrap">
        <div className="section-head reveal">
          <div><div className="eyebrow">Comece por onde fizer sentido</div><h2 className="section-title">O que você gostaria<br />de descobrir?</h2></div>
          <button className="text-link desktop-only" onClick={() => onAssessment('Todas as avaliações')}>Ver todas as avaliações <ArrowRight size={15} /></button>
        </div>
        <div className="path-grid">
          {secondaryAssessments.map((item) => (
            <article className="path-card reveal" key={item.index}>
              <div><span className="path-index">{item.index}</span><h3>{item.title}</h3><p>{item.description}</p></div>
              <button className="text-link" onClick={() => onAssessment(item.title)}>Começar <ArrowRight size={14} /></button>
            </article>
          ))}
        </div>
        <button className="text-link path-more" onClick={() => onAssessment('Todas as avaliações')}>Ver todas as avaliações <ArrowRight size={15} /></button>
      </div>
    </section>
  );
}

function FeaturedAssessment({ onAssessment }: { onAssessment: (name: string) => void }) {
  return (
    <section className="section featured dark" id="tdah">
      <div className="wrap featured-grid">
        <div className="reveal">
          <div className="eyebrow eyebrow-light">Experiência em destaque</div>
          <h2>Teste de TDAH<br /><span>em adultos.</span></h2>
          <p className="featured-copy">Explore como sua atenção funciona no dia a dia. Avalie padrões relacionados à atenção, organização, impulsividade e rotina através de uma experiência rápida e estruturada.</p>
          <div className="detail-row"><span><strong>3–5 min</strong>tempo aproximado</span><span><strong>Grátis</strong>resultado inicial</span><span><strong>Não</strong>precisa de cartão</span></div>
          <button className="button button-primary" onClick={() => onAssessment('Teste de TDAH em adultos')}>Fazer avaliação gratuita <ArrowRight size={16} /></button>
          <p className="featured-note">Ferramenta de triagem e autoconhecimento. O resultado não constitui diagnóstico médico.</p>
        </div>
        <div className="spacer desktop-only" aria-hidden="true" />
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [['01', 'Responda', 'Faça uma avaliação rápida e interativa.'], ['02', 'Descubra', 'Receba gratuitamente seu resultado inicial.'], ['03', 'Aprofunde', 'Explore análises detalhadas e desenvolva seu NURA Perfil.']];
  return (
    <section className="section how" id="como-funciona">
      <div className="wrap">
        <div className="eyebrow reveal">Uma jornada simples</div>
        <h2 className="section-title reveal">Descobrir mais sobre<br />você pode ser simples.</h2>
        <div className="steps">
          {steps.map(([number, title, copy]) => <article className="step reveal" key={number}><div className="step-number">{number}</div><div className="step-mark" /><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>
  );
}

function NuraProfile() {
  const stats = [['Cognição', 4, ''], ['Atenção', 3, ''], ['Personalidade', 4, 'v'], ['Comportamento', 2, ''], ['Carreira', 0, '']];
  return (
    <section className="section profile dark" id="perfil">
      <div className="wrap profile-grid">
        <div className="spacer desktop-only" aria-hidden="true" />
        <div className="reveal">
          <div className="eyebrow eyebrow-light">O que se constrói com o tempo</div>
          <h2>Cada descoberta revela uma nova <span>dimensão.</span></h2>
          <p className="profile-copy">Suas avaliações constroem progressivamente o seu NURA Perfil: um mapa vivo de dimensões exploradas, nós e conexões. Nunca uma pontuação universal — apenas o quanto você já se conheceu por aqui.</p>
          <div className="profile-stats">{stats.map(([label, filled, tone]) => <div className="profile-stat" key={label}><span style={{ width: 112 }}>{label}</span><span className="profile-dots">{[0, 1, 2, 3, 4].map((dot) => <i className={`${dot < Number(filled) ? 'on' : ''} ${tone === 'v' && dot < Number(filled) ? 'v' : ''}`} key={dot} />)}</span></div>)}</div>
          <p className="profile-legend">Os percentuais representam o quanto você explorou do ecossistema NURA. Não significam inteligência, saúde ou diagnóstico.</p>
        </div>
      </div>
    </section>
  );
}

function ResultPreview() {
  return (
    <section className="section result" id="resultado">
      <div className="wrap result-grid">
        <div className="reveal"><div className="eyebrow">Um primeiro olhar</div><h2>Seu resultado começa a contar uma história.</h2><p className="result-copy">Você recebe um resultado inicial gratuitamente. Uma leitura clara para despertar a próxima pergunta — e não encerrar a conversa sobre você.</p></div>
        <div className="result-card reveal">
          <div className="result-card-head"><div><span className="mono" style={{ color: '#667085', fontSize: 10 }}>SEU RESULTADO</span><h3>Seu Perfil Cognitivo</h3></div><div className="result-avatar">N.</div></div>
          <span className="result-tag">perfil predominante</span><div className="result-highlight"><b>ANALÍTICO</b><small>Principal destaque · reconhecimento de padrões</small></div>
          {[['Raciocínio', 87], ['Padrões', 91], ['Atenção', 78], ['Memória', 82]].map(([label, value]) => <div className="metric" key={label}><div><span>{label}</span><div className="metric-track"><span style={{ width: `${value}%` }} /></div></div><b>{value}</b></div>)}
        </div>
      </div>
    </section>
  );
}

function PremiumSection({ onStart }: { onStart: () => void }) {
  return (
    <section className="section premium" id="aprofundar">
      <div className="wrap premium-grid">
        <div className="reveal"><div className="eyebrow">Depois do primeiro olhar</div><h2>Quer entender seu resultado em profundidade?</h2><div className="price">R$ 19,90 <small>pagamento único</small></div><p className="premium-note">Sem assinatura automática. Você experimenta antes de decidir.</p><ul className="benefits"><li>Análise e interpretação detalhadas</li><li>Dimensões, pontos fortes e pontos de atenção</li><li>Recomendações para continuar explorando</li><li>Contribuição para o seu NURA Perfil</li></ul></div>
        <aside className="reveal"><h3>Conhecer é um processo.</h3><p>O relatório completo organiza os sinais que apareceram na sua experiência e abre caminhos para a próxima descoberta.</p><button className="button button-primary button-wide" onClick={onStart}>Começar gratuitamente <ArrowRight size={16} /></button></aside>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="section trust" id="responsabilidade">
      <div className="wrap trust-grid">
        <div className="reveal"><div className="eyebrow">Clareza antes de tudo</div><h2>Avaliações feitas com responsabilidade.</h2><p className="trust-copy">Descoberta pessoal só faz sentido quando vem acompanhada de contexto, limites claros e respeito por quem está do outro lado.</p></div>
        <div className="trust-points reveal">
          <div className="trust-point"><h3><ShieldCheck size={16} className="trust-icon" aria-hidden="true" />Informação, não sentença</h3><p>Resultados são informativos. Instrumentos de triagem não substituem diagnóstico profissional.</p></div>
          <div className="trust-point"><h3><LockKeyhole size={16} className="trust-icon" aria-hidden="true" />Seus dados, sua escolha</h3><p>Transparência sobre finalidade, consentimento, exclusão e cuidado no tratamento dos seus dados.</p></div>
          <div className="trust-point"><h3><Check size={16} className="trust-icon" aria-hidden="true" />Metodologia transparente</h3><p>Uma experiência construída para estimular autoconhecimento, sem promessas de precisão impossível.</p></div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section faq" id="faq">
      <div className="wrap faq-layout">
        <div className="reveal"><div className="eyebrow">Antes de começar</div><h2 className="section-title">Perguntas que podem surgir.</h2></div>
        <div className="faq-list reveal">{faqs.map(([question, answer], index) => <div className="faq-item" key={question}><button className={`faq-question ${open === index ? 'open' : ''}`} aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>{question}<Plus size={18} /></button>{open === index && <div className="faq-answer">{answer}</div>}</div>)}</div>
      </div>
    </section>
  );
}

function Footer({ onStart }: { onStart: () => void }) {
  return <footer className="footer"><div className="wrap"><div className="footer-grid"><div><NuraLogo light={false} /><p className="footer-copy">Uma experiência inteligente para quem quer se observar com mais curiosidade.</p></div><nav className="footer-nav" aria-label="Navegação do rodapé"><a href="#avaliacoes">Avaliações</a><a href="#perfil">NURA Perfil</a><a href="#faq">Dúvidas</a><a href="#responsabilidade">Privacidade</a><button className="text-link" onClick={onStart}>Começar <ArrowRight size={13} /></button></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} NURA. Todos os direitos reservados.</span><span>Feito para descobrir, não para rotular.</span></div></div></footer>;
}

function LandingPage() {
  const [feedback, setFeedback] = useState('');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFeedback = (name: string) => {
    setFeedback(name === 'Todas as avaliações' ? 'As próximas experiências estão chegando. Comece pela avaliação em destaque.' : `${name} está pronta para ser sua primeira descoberta.`);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 4500);
    scrollToId(name === 'Todas as avaliações' ? 'avaliacoes' : 'tdah');
  };
  useEffect(() => {
    const eventHandler = (event: Event) => setFeedback((event as CustomEvent<string>).detail);
    window.addEventListener('nura:feedback', eventHandler);
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible')), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    return () => { observer.disconnect(); window.removeEventListener('nura:feedback', eventHandler); if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, []);
  const start = () => { scrollToId('tdah'); setFeedback('Você pode começar sua descoberta gratuitamente.'); if (feedbackTimer.current) clearTimeout(feedbackTimer.current); feedbackTimer.current = setTimeout(() => setFeedback(''), 4500); };
  return (
    <main className="nura-page">
      <WebGLRenderer />
      <Header onStart={start} />
      <Hero onStart={start} />
      <Statement />
      <FeaturedAssessment onAssessment={showFeedback} />
      <AssessmentPaths onAssessment={showFeedback} />
      <HowItWorks />
      <NuraProfile />
      <ResultPreview />
      <PremiumSection onStart={start} />
      <TrustSection />
      <FAQ />
      <section className="section final-cta"><div className="wrap final-inner reveal"><div className="eyebrow eyebrow-light">A próxima descoberta pode começar agora</div><h2>Você ainda tem muito para descobrir.</h2><p>Comece com uma pergunta. O resto do seu perfil se constrói no caminho.</p><button className="button button-light" onClick={start}>Começar minha descoberta <ArrowRight size={16} /></button></div></section>
      <Footer onStart={start} />
      <MobileStickyCTA onStart={start} />
      {feedback && <div className="toast" role="status"><strong>NURA</strong>{feedback}</div>}
    </main>
  );
}

function Router() {
  return <Switch><Route path="/" component={LandingPage} /><Route component={NotFound} /></Switch>;
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
    </WouterRouter>
  );
}

export default App;