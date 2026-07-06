import { useRef } from 'react';
import { TitleCard } from './TitleCard';
import './TitleRow.css';

export function TitleRow({ heading, items, onSelectTitle }) {
  const scrollerRef = useRef(null);

  const scrollBy = (amount) => {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="title-row">
      <h2 className="title-row__heading">{heading}</h2>
      <div className="title-row__viewport">
        <button className="title-row__arrow title-row__arrow--left" onClick={() => scrollBy(-600)} aria-label="Scroll left">
          ‹
        </button>
        <div className="title-row__scroller" ref={scrollerRef}>
          {items.map((title, i) => (
            <div className="title-row__item" key={title.id}>
              <TitleCard title={title} onSelect={onSelectTitle} priority={i < 6} />
            </div>
          ))}
        </div>
        <button className="title-row__arrow title-row__arrow--right" onClick={() => scrollBy(600)} aria-label="Scroll right">
          ›
        </button>
      </div>
    </section>
  );
}
