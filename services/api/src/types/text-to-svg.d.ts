declare module 'text-to-svg' {
    interface TextToSVGOptions {
        fontSize?: number;
        x?: number;
        y?: number;
        anchor?: 'start' | 'middle' | 'end';
        letterSpacing?: number;
        tracking?: number;
        leading?: number;
        kerning?: boolean;
        features?: Record<string, boolean>;
    }

    interface Metrics {
        width: number;
        height: number;
        ascender: number;
        descender: number;
        baseline: number;
        xMax: number;
        xMin: number;
        yMax: number;
        yMin: number;
    }

    class TextToSVG {
        constructor(fontPath: string | Buffer);
        static loadSync(fontPath?: string): string;
        static load(fontPath?: string): Promise<string>;

        getMetrics(text: string, options?: TextToSVGOptions): Metrics;
        getPath(text: string, options?: TextToSVGOptions): string;
        getSVG(text: string, options?: TextToSVGOptions): string;
    }

    export = TextToSVG;
}
