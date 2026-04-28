import { useEffect, useRef, useState } from "react";

interface MermaidProps {
	chart: string;
}

let mermaidLoaded = false;

async function loadMermaid() {
	if (mermaidLoaded) return;
	const mermaid = (await import("mermaid")).default;
	mermaid.initialize({
		startOnLoad: false,
		theme: "default",
		securityLevel: "loose",
	});
	mermaidLoaded = true;
}

export default function Mermaid({ chart }: MermaidProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [svg, setSvg] = useState<string>("");
	const [error, setError] = useState<string>("");

	useEffect(() => {
		let cancelled = false;

		async function render() {
			try {
				await loadMermaid();
				const mermaid = (await import("mermaid")).default;
				const id = `mermaid-${Math.random().toString(36).slice(2)}`;
				const { svg: renderedSvg } = await mermaid.render(id, chart.trim());
				if (!cancelled) setSvg(renderedSvg);
			} catch (err) {
				if (!cancelled) setError(String(err));
			}
		}

		render();
		return () => {
			cancelled = true;
		};
	}, [chart]);

	if (error) {
		return (
			<pre
				style={{
					color: "red",
					border: "1px solid red",
					padding: "8px",
					borderRadius: "4px",
				}}
			>
				Mermaid error: {error}
			</pre>
		);
	}

	if (!svg) {
		return (
			<div
				style={{
					padding: "16px",
					textAlign: "center",
					color: "var(--rp-c-text-2)",
				}}
			>
				Loading diagram…
			</div>
		);
	}

	return (
		<div
			ref={ref}
			style={{ overflowX: "auto", margin: "1.5rem 0" }}
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}
