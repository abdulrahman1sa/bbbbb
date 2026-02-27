"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import messagesData from "./data.json";
import { Download, Maximize2, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useScroll, useSpring, useInView, useMotionValue, useTransform } from "framer-motion";

const messages: any[] = messagesData;

/* ─────────────────── types ─────────────────── */
interface PhotoEntry {
    key: string;
    url: string;
    postId: string;
    idx: number;
    date: string;
    text: string;
}

/* ─────────────────── helpers ─────────────────── */
function dl(url: string, id: string) {
    fetch(url).then(r => r.blob()).then(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `bandar-algaloud-${id}.jpg`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }).catch(() => window.open(url, "_blank"));
}

function yearOf(d: string) {
    if (!d) return "Unknown";
    const y = new Date(d).getFullYear();
    return isNaN(y) ? "Unknown" : String(y);
}

// Always use en-US to prevent SSR/client hydration mismatch
function fmt(n: number | string): string {
    if (typeof n === "number") return n.toLocaleString("en-US");
    return String(n).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

function buildPhotoList(): PhotoEntry[] {
    const list: PhotoEntry[] = [];
    messages.forEach((m) => {
        if (!m.photos?.length) return;
        (m.photos as string[]).forEach((url, i) => {
            list.push({ key: `${m.id}-${i}`, url, postId: m.id, idx: i, date: m.date ?? "", text: m.text ?? "" });
        });
    });
    return list;
}

const ALL_PHOTOS = buildPhotoList();

/* ─────────────────── cinematic intro ─────────────────── */
function CinematicIntro({ onDone }: { onDone: () => void }) {
    return (
        <motion.div
            className="intro-screen"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
        >
            <motion.img
                src="/logo.png"
                alt="بندر الجلعود"
                className="intro-logo"
                initial={{ opacity: 0, scale: 0.75, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.6, ease: [0.19, 1, 0.22, 1] }}
            />
            <motion.p
                className="intro-tagline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.8 }}
            >
                التوثيق الفوتوغرافي الرسمي للمملكة العربية السعودية
            </motion.p>
            <motion.button
                className="intro-enter"
                onClick={onDone}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 1.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
            >
                <span>استكشف الأرشيف</span>
                <span className="intro-enter-arrow">↓</span>
            </motion.button>
        </motion.div>
    );
}

/* ─────────────────── lightbox ─────────────────── */
function Lightbox({ photos, initialIndex, onClose }: { photos: PhotoEntry[]; initialIndex: number; onClose: () => void }) {
    const [idx, setIdx] = useState(initialIndex);
    const current = photos[idx];

    const prev = useCallback(() => setIdx(i => (i - 1 + photos.length) % photos.length), [photos.length]);
    const next = useCallback(() => setIdx(i => (i + 1) % photos.length), [photos.length]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") prev();
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") next();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        document.body.style.overflow = "hidden";
        return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
    }, [prev, next, onClose]);

    return (
        <AnimatePresence>
            <motion.div
                className="lightbox-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.img
                    key={idx} src={current.url} className="lightbox-img"
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }} onClick={e => e.stopPropagation()} alt="توثيق ملكي"
                    onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.retried) {
                            img.dataset.retried = "true";
                            img.src = `/api/image?id=${current.postId}&idx=${current.idx}`;
                        }
                    }}
                />
                <button className="lightbox-close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
                <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="التالية"><ChevronLeft size={22} /></button>
                <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="السابقة"><ChevronRight size={22} /></button>
                <div className="lightbox-meta" onClick={e => e.stopPropagation()}>
                    {current.date && <p>{new Date(current.date).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric", numberingSystem: "latn" })}</p>}
                    <span>{fmt(idx + 1)} / {fmt(photos.length)}</span><br />
                    <button className="lightbox-dl" onClick={() => dl(current.url, current.postId)}>
                        <Download size={14} /> تحميل بجودة عالية
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ─────────────────── tile ─────────────────── */
function Tile({ photo, idx, onOpen, museumMode }: { photo: PhotoEntry; idx: number; onOpen: () => void; museumMode: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [6, -6]);
    const rotateY = useTransform(x, [-100, 100], [-6, 6]);

    function handleMouse(event: React.MouseEvent) {
        if (museumMode) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left - rect.width / 2);
        y.set(event.clientY - rect.top - rect.height / 2);
    }

    const dateStr = photo.date
        ? new Date(photo.date).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric", numberingSystem: "latn" })
        : "—";

    return (
        <motion.div
            ref={ref}
            className={`photo-tile ${museumMode ? "museum-tile" : ""}`}
            style={museumMode ? {} : { rotateX, rotateY }}
            onMouseMove={handleMouse}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.9, delay: (idx % 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
            onClick={onOpen}
        >
            <img src={photo.url} alt="توثيق ملكي" loading="lazy"
                onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.retried) {
                        img.dataset.retried = "true";
                        img.src = `/api/image?id=${photo.postId}&idx=${photo.idx}`;
                    } else {
                        img.style.display = "none";
                    }
                }} />
            {museumMode ? (
                <div className="museum-caption">
                    <span className="museum-date">{dateStr}</span>
                </div>
            ) : (
                <div className="tile-veil">
                    <p className="tile-meta">{dateStr}</p>
                    <div className="tile-actions">
                        <button className="tile-btn" aria-label="تحميل" onClick={(e) => { e.stopPropagation(); dl(photo.url, photo.postId); }}>
                            <Download size={14} aria-hidden="true" />
                        </button>
                        <button className="tile-btn" aria-label="تكبير" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
                            <Maximize2 size={14} aria-hidden="true" />
                        </button>
                        <a className="tile-btn" href={`https://t.me/Bandaralgaloud/${photo.postId}`} target="_blank" rel="noreferrer noopener" aria-label="المصدر" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={14} aria-hidden="true" />
                        </a>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

/* ─────────────────── year section ─────────────────── */
function YearSection({ year, photos, setLightbox, museumMode }: {
    year: string; photos: PhotoEntry[];
    setLightbox: (i: number, arr: PhotoEntry[]) => void; museumMode: boolean;
}) {
    const [shown, setShown] = useState(12);
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });
    const displayedYear = year === "Unknown" ? "أخرى" : fmt(year);

    return (
        <section className={`year-section ${museumMode ? "museum-year" : ""}`}>
            <div className="year-banner" ref={ref}>
                <motion.div className="year-fig"
                    initial={{ opacity: 0, x: -100 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 1.4, ease: [0.19, 1, 0.22, 1] }}
                >{displayedYear}</motion.div>
                <motion.div className="year-info"
                    initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.9, delay: 0.35 }}
                >
                    <em>أرشيف العام</em>
                    <strong>{fmt(photos.length)} صورة</strong>
                </motion.div>
                <motion.div className="year-divider"
                    initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}}
                    style={{ transformOrigin: "right" }}
                    transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>
            <div className={museumMode ? "museum-grid" : "masonry"}>
                {photos.slice(0, shown).map((p, i) => (
                    <Tile key={p.key} photo={p} idx={i} museumMode={museumMode}
                        onOpen={() => setLightbox(i, photos.slice(0, shown))} />
                ))}
            </div>
            {shown < photos.length && (
                <div className="year-more">
                    <button className="btn-more" onClick={() => setShown(s => s + 12)}>
                        عرض {fmt(Math.min(12, photos.length - shown))} صورة إضافية من {displayedYear}
                    </button>
                </div>
            )}
        </section>
    );
}

/* ─────────────────── about section ─────────────────── */
function AboutSection({ totalPhotos, years }: { totalPhotos: number; years: string[] }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    const achievements = [
        { num: fmt(totalPhotos), label: "صورة توثيقية", desc: "أرشيف فوتوغرافي متكامل." },
        { num: fmt(years.length), label: "عامًا من التوثيق المتواصل", desc: "مسيرة مهنية مستمرة." },
        { num: "+100", label: "مناسبة وطنية ورسمية", desc: "تغطيات احترافية للفعاليات الكبرى." },
        { num: "1", label: "عدسة واحدة · رؤية ثابتة", desc: "توثيق اللحظة بعين الفنان ودقة المؤرخ." },
    ];

    return (
        <section className="about-section" ref={ref}>
            <div className="about-inner">
                <motion.div className="about-text"
                    initial={{ opacity: 0, x: 60 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
                >
                    <span className="about-label">المصور</span>
                    <h2 className="about-name">بَنْدَر الجلعود</h2>
                    <p className="about-bio">
                        مصور فوتوغرافي سعودي، متخصص في توثيق المناسبات الوطنية والفعاليات الرسمية
                        في المملكة العربية السعودية.
                        قدّم عبر مسيرته أرشيفًا بصريًا يوثق محطات مهمة من المشهد الوطني
                        بعدسة احترافية ورؤية دقيقة.
                    </p>
                    <a
                        href="https://t.me/Bandaralgaloud"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="about-link"
                    >
                        قناة التيليغرام الرسمية ↗
                    </a>
                </motion.div>

                <div className="about-stats">
                    {achievements.map((a, i) => (
                        <motion.div key={i} className="about-stat-card"
                            initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.9, delay: 0.2 + i * 0.15 }}
                        >
                            <strong>{a.num}</strong>
                            <span>{a.label}</span>
                            <p>{a.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────────── page ─────────────────── */
export default function Home() {
    const [showIntro, setShowIntro] = useState(true);
    const [introGone, setIntroGone] = useState(false);
    const [activeYear, setActiveYear] = useState<string | null>(null);
    const [lightbox, setLightboxState] = useState<{ idx: number; arr: PhotoEntry[] } | null>(null);
    const [museumMode, setMuseumMode] = useState(false);
    const [livePhotos, setLivePhotos] = useState<PhotoEntry[]>([]);

    useEffect(() => {
        fetch('/api/feed')
            .then(res => res.json())
            .then((newPosts) => {
                const fresh: PhotoEntry[] = [];
                newPosts.forEach((m: any) => {
                    // Only add if it doesn't already exist in static dataset
                    const exists = ALL_PHOTOS.some(p => p.postId === m.id);
                    if (!exists && m.photos) {
                        m.photos.forEach((url: string, i: number) => {
                            fresh.push({
                                key: `live-${m.id}-${i}`,
                                url,
                                postId: m.id,
                                idx: i,
                                date: m.date || new Date().toISOString(),
                                text: m.text || ""
                            });
                        });
                    }
                });
                if (fresh.length > 0) {
                    setLivePhotos(fresh);
                }
            })
            .catch(console.error);
    }, []);

    const COMBINED_PHOTOS = [...livePhotos, ...ALL_PHOTOS];

    const { scrollYProgress } = useScroll();
    const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

    const setLightbox = useCallback((i: number, arr: PhotoEntry[]) => setLightboxState({ idx: i, arr }), []);

    const heroSrc = COMBINED_PHOTOS[0]?.url;

    const byYear: Record<string, PhotoEntry[]> = {};
    COMBINED_PHOTOS.forEach((p) => {
        const y = yearOf(p.date);
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(p);
    });
    const allYears = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));
    const datedYears = allYears.filter(y => y !== "Unknown");
    const filteredYears = activeYear ? [activeYear] : allYears;

    function handleIntroExit() {
        setShowIntro(false);
        setTimeout(() => setIntroGone(true), 1300);
    }

    return (
        <>
            <AnimatePresence>
                {showIntro && <CinematicIntro onDone={handleIntroExit} />}
            </AnimatePresence>

            <main className={`site-main ${introGone ? "visible" : ""}`}>
                <div className="grain-overlay" />
                {lightbox && (
                    <Lightbox photos={lightbox.arr} initialIndex={lightbox.idx} onClose={() => setLightboxState(null)} />
                )}

                <motion.div className="progress-bar" style={{ scaleX: progress }} />

                {/* nav */}
                <nav className="site-nav">
                    <img src="/logo.png" alt="بندر الجلعود" className="nav-logo-img" />
                    <div className="nav-logo">بَنْدَر <span className="nav-logo-gold">الجلعود</span></div>
                    <div className="nav-rule" />
                    <div className="nav-actions">
                        <button
                            className={`museum-toggle ${museumMode ? "active" : ""}`}
                            onClick={() => setMuseumMode(m => !m)}
                            aria-label="وضع المتحف"
                        >
                            {museumMode ? "🎨 وضع المعرض" : "🏛️ وضع المتحف"}
                        </button>
                        <div className="nav-label">مُصوّر الملوك • الأرشيف الفني التاريخي</div>
                    </div>
                </nav>

                {/* hero */}
                <header className="hero">
                    <div className="hero-bg">{heroSrc && <img src={heroSrc} alt="غلاف" onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.retried && COMBINED_PHOTOS[0]) {
                            img.dataset.retried = "true";
                            img.src = `/api/image?id=${COMBINED_PHOTOS[0].postId}&idx=${COMBINED_PHOTOS[0].idx}`;
                        }
                    }} />}</div>
                    <div className="hero-gradient" />
                    <div className="hero-content">
                        <motion.img src="/logo.png" alt="بندر الجلعود" className="hero-logo-img"
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
                        />
                        <motion.p className="hero-khatm"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.1, delay: 0.5 }}>
                            التوثيق الفوتوغرافي الرسمي للمناسبات الملكية
                        </motion.p>
                        <motion.h1 className="hero-title"
                            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                            بَنْدَر الجلعود
                            <span className="hero-title-secondary">المصور الرسمي • المملكة العربية السعودية</span>
                        </motion.h1>
                        <motion.div className="hero-bar"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 1 }}>
                            <div className="hero-stat">
                                <strong>{fmt(COMBINED_PHOTOS.length)}</strong>
                                <small>صورة توثيقية</small>
                            </div>
                            <div className="hero-sep" />
                            <div className="hero-stat">
                                <strong>{fmt(datedYears.length)}</strong>
                                <small>أعوام من الأرشفة</small>
                            </div>
                            <div className="hero-sep" />
                            <div className="hero-stat">
                                <strong>{fmt(datedYears[0])}</strong>
                                <small>آخر تحديث</small>
                            </div>
                            <div className="hero-cue">
                                <span>استكشف التاريخ</span>
                                <div className="cue-dot" />
                            </div>
                        </motion.div>
                    </div>
                </header>

                {/* about */}
                <AboutSection totalPhotos={COMBINED_PHOTOS.length} years={datedYears} />

                {/* year filter pills only */}
                <div className="filter-bar">
                    <div className="year-pills">
                        <button className={`pill ${activeYear === null ? "active" : ""}`} onClick={() => setActiveYear(null)}>الكل</button>
                        {datedYears.map(y => (
                            <button key={y} className={`pill ${activeYear === y ? "active" : ""}`}
                                onClick={() => setActiveYear(activeYear === y ? null : y)}>{fmt(y)}</button>
                        ))}
                    </div>
                </div>

                {/* archive */}
                <div className={`archive ${museumMode ? "museum-archive" : ""}`}>
                    {filteredYears.map(y => {
                        const photos = byYear[y] ?? [];
                        if (!photos.length) return null;
                        return (
                            <YearSection key={y} year={y} photos={photos}
                                setLightbox={setLightbox} museumMode={museumMode} />
                        );
                    })}
                </div>

                {/* footer */}
                <footer className="site-footer">
                    <img src="/logo.png" alt="بندر الجلعود" className="footer-logo" />
                    <div className="footer-rule" />
                    <p className="footer-sub">
                        الأرشيف الرسمي للتوثيق الفوتوغرافي الملكي<br />
                        جميع الحقوق محفوظة © {new Date().getFullYear()}
                    </p>
                </footer>
            </main>
        </>
    );
}
