import { useEffect, useRef, useState } from "react";

interface MermaidProps {
	chart: string;
}

function isDarkMode(): boolean {
	return document.documentElement.classList.contains("dark");
}

async function renderChart(chart: string, dark: boolean): Promise<string> {
	const mermaid = (await import("mermaid")).default;
	mermaid.initialize({
		startOnLoad: false,
		theme: dark ? "dark" : "default",
		securityLevel: "loose",
	});
	const id = `mermaid-${Math.random().toString(36).slice(2)}`;
	const { svg } = await mermaid.render(id, chart.trim());
	return svg;
}

export default function Mermaid({ chart }: MermaidProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [svg, setSvg] = useState<string>("");
	const [error, setError] = useState<string>("");

	useEffect(() => {
		let cancelled = false;

		async function render() {
			try {
				const dark = isDarkMode();
				const renderedSvg = await renderChart(chart, dark);
				if (!cancelled) {
					setSvg(renderedSvg);
					setError("");
				}
			} catch (err) {
				if (!cancelled) setError(String(err));
			}
		}

		render();

		const observer = new MutationObserver(() => {
			render();
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => {
			cancelled = true;
			observer.disconnect();
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
