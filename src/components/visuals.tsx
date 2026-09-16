import primitive from './visual-primitives';
export const Icon = ({ name }: { name: string }) => (
  <span className="visual" dangerouslySetInnerHTML={{ __html: primitive.icon(name) }} />
);
export const Art = ({ name }: { name: string }) => (
  <span className="visual" dangerouslySetInnerHTML={{ __html: primitive.art(name) }} />
);
export const Dot = ({ value }: { value: string | number }) => (
  <span className="visual" dangerouslySetInnerHTML={{ __html: primitive.dots(value) }} />
);
export const Progress = ({ value }: { value: number }) => (
  <span className="visual" dangerouslySetInnerHTML={{ __html: primitive.progress(value) }} />
);
export const Badge = ({ type, locked = false }: { type: string; locked?: boolean }) => (
  <span className="visual" dangerouslySetInnerHTML={{ __html: primitive.badge(type, locked) }} />
);
export const Gauge = ({ value }: { value: number }) => (
  <span className="visual" dangerouslySetInnerHTML={{ __html: primitive.gauge(value) }} />
);
