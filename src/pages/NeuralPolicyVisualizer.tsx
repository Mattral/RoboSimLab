import { useState, useRef, useEffect, useCallback } from "react";
import SimLayout from "@/components/SimLayout";
import SliderControl from "@/components/SliderControl";
import ControlSection from "@/components/ControlSection";

interface Neuron { x: number; y: number; activation: number; }
interface Connection { from: number; to: number; weight: number; }

const NeuralPolicyVisualizer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const [sensorDist, setSensorDist] = useState(0.5);
  const [sensorAngle, setSensorAngle] = useState(0.3);
  const [sensorVel, setSensorVel] = useState(0.7);
  const [goalDist, setGoalDist] = useState(0.8);
  const [running, setRunning] = useState(true);
  const [showWeights, setShowWeights] = useState(true);
  const [showActivations, setShowActivations] = useState(true);
  const [showSignalFlow, setShowSignalFlow] = useState(true);
  const [animSpeed, setAnimSpeed] = useState(1);

  const layerSizes = [4, 8, 6, 4, 2]; // input → hidden → hidden → hidden → output
  const layerLabels = ["Sensors", "Hidden 1", "Hidden 2", "Hidden 3", "Actions"];
  const inputLabels = ["Distance", "Angle", "Velocity", "Goal Dist"];
  const outputLabels = ["Steer", "Throttle"];

  // Sigmoid
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  const relu = (x: number) => Math.max(0, x);

  // Generate deterministic weights
  const weightsRef = useRef<number[][]>([]);
  const biasesRef = useRef<number[][]>([]);

  useEffect(() => {
    const seed = (n: number) => Math.sin(n * 12.9898 + 78.233) * 0.5;
    const weights: number[][] = [];
    const biases: number[][] = [];
    let idx = 0;
    for (let l = 0; l < layerSizes.length - 1; l++) {
      const w: number[] = [];
      const b: number[] = [];
      for (let j = 0; j < layerSizes[l + 1]; j++) {
        b.push(seed(idx++) * 0.3);
        for (let i = 0; i < layerSizes[l]; i++) {
          w.push(seed(idx++) * 2);
        }
      }
      weights.push(w);
      biases.push(b);
    }
    weightsRef.current = weights;
    biasesRef.current = biases;
  }, []);

  // Forward pass
  const forwardPass = useCallback((inputs: number[]) => {
    const activations: number[][] = [inputs];
    let current = inputs;
    for (let l = 0; l < layerSizes.length - 1; l++) {
      const W = weightsRef.current[l];
      const B = biasesRef.current[l];
      if (!W || !B) { activations.push(new Array(layerSizes[l + 1]).fill(0)); current = activations[activations.length - 1]; continue; }
      const next: number[] = [];
      for (let j = 0; j < layerSizes[l + 1]; j++) {
        let sum = B[j] || 0;
        for (let i = 0; i < layerSizes[l]; i++) {
          sum += current[i] * (W[j * layerSizes[l] + i] || 0);
        }
        next.push(l === layerSizes.length - 2 ? sigmoid(sum) : relu(sum));
      }
      activations.push(next);
      current = next;
    }
    return activations;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (running) timeRef.current += 0.016 * animSpeed;
      const t = timeRef.current;

      // Animated inputs
      const inputs = [
        sensorDist + Math.sin(t * 1.2) * 0.2,
        sensorAngle + Math.cos(t * 0.8) * 0.15,
        sensorVel + Math.sin(t * 1.5) * 0.1,
        goalDist + Math.cos(t * 0.6) * 0.1,
      ].map(v => Math.max(0, Math.min(1, v)));

      const activations = forwardPass(inputs);

      // Layout neurons
      const margin = 60;
      const layerSpacing = (w - margin * 2) / (layerSizes.length - 1);
      const neurons: Neuron[][] = [];

      for (let l = 0; l < layerSizes.length; l++) {
        const layerNeurons: Neuron[] = [];
        const n = layerSizes[l];
        const totalH = (n - 1) * 36;
        const startY = (h - totalH) / 2;
        for (let i = 0; i < n; i++) {
          layerNeurons.push({
            x: margin + l * layerSpacing,
            y: startY + i * 36,
            activation: activations[l]?.[i] ?? 0,
          });
        }
        neurons.push(layerNeurons);
      }

      // Draw connections
      for (let l = 0; l < neurons.length - 1; l++) {
        const W = weightsRef.current[l];
        if (!W) continue;
        for (let j = 0; j < neurons[l + 1].length; j++) {
          for (let i = 0; i < neurons[l].length; i++) {
            const weight = W[j * layerSizes[l] + i] || 0;
            const from = neurons[l][i];
            const to = neurons[l + 1][j];
            const strength = Math.abs(weight);
            const signal = from.activation * Math.abs(weight);

            if (showWeights) {
              ctx.strokeStyle = weight > 0
                ? `hsla(172, 78%, 47%, ${Math.min(0.5, strength * 0.5)})`
                : `hsla(0, 62%, 50%, ${Math.min(0.5, strength * 0.5)})`;
              ctx.lineWidth = Math.max(0.3, strength * 2);
              ctx.beginPath();
              ctx.moveTo(from.x, from.y);
              ctx.lineTo(to.x, to.y);
              ctx.stroke();
            }

            // Signal flow animation
            if (showSignalFlow && signal > 0.1) {
              const phase = (t * 3 + l * 0.5 + i * 0.2) % 1;
              const px = from.x + (to.x - from.x) * phase;
              const py = from.y + (to.y - from.y) * phase;
              const radius = Math.max(1.5, signal * 3);
              ctx.fillStyle = weight > 0
                ? `hsla(172, 78%, 60%, ${Math.min(0.8, signal)})`
                : `hsla(0, 62%, 60%, ${Math.min(0.8, signal)})`;
              ctx.beginPath();
              ctx.arc(px, py, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Draw neurons
      for (let l = 0; l < neurons.length; l++) {
        for (let i = 0; i < neurons[l].length; i++) {
          const n = neurons[l][i];
          const a = Math.max(0, Math.min(1, n.activation));
          const r = l === 0 || l === neurons.length - 1 ? 14 : 10;

          // Glow
          if (showActivations && a > 0.3) {
            const grad = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r * 3);
            grad.addColorStop(0, `hsla(172, 78%, 47%, ${a * 0.3})`);
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Node
          ctx.fillStyle = showActivations
            ? `hsl(172, ${50 + a * 30}%, ${15 + a * 40}%)`
            : "hsl(228, 13%, 15%)";
          ctx.strokeStyle = a > 0.7 ? "hsl(172, 78%, 47%)" : "hsl(228, 13%, 20%)";
          ctx.lineWidth = a > 0.7 ? 2 : 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Activation text
          if (showActivations) {
            ctx.fillStyle = "hsl(210, 20%, 85%)";
            ctx.font = "8px 'JetBrains Mono'";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(a.toFixed(2), n.x, n.y);
          }
        }

        // Layer labels
        const firstN = neurons[l][0];
        ctx.fillStyle = "hsl(220, 10%, 44%)";
        ctx.font = "9px 'Inter'";
        ctx.textAlign = "center";
        ctx.fillText(layerLabels[l], firstN.x, 20);
      }

      // Input labels
      neurons[0].forEach((n, i) => {
        ctx.fillStyle = "hsl(38, 88%, 52%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(inputLabels[i], n.x - 20, n.y);
      });

      // Output labels
      const lastLayer = neurons[neurons.length - 1];
      lastLayer.forEach((n, i) => {
        ctx.fillStyle = "hsl(152, 68%, 42%)";
        ctx.font = "9px 'JetBrains Mono'";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`${outputLabels[i]}: ${n.activation.toFixed(2)}`, n.x + 20, n.y);
      });

      // Robot action visualization (bottom)
      const steer = (activations[activations.length - 1]?.[0] ?? 0.5) - 0.5;
      const throttle = activations[activations.length - 1]?.[1] ?? 0.5;
      const actionY = h - 50;
      const actionX = w / 2;

      ctx.fillStyle = "hsla(228, 15%, 7%, 0.8)";
      ctx.beginPath(); ctx.roundRect(actionX - 100, actionY - 20, 200, 40, 4); ctx.fill();

      // Steering indicator
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.font = "9px 'Inter'";
      ctx.textAlign = "center";
      ctx.fillText("STEER", actionX - 50, actionY - 8);
      ctx.fillStyle = "hsl(228, 13%, 15%)";
      ctx.fillRect(actionX - 80, actionY, 60, 8);
      ctx.fillStyle = steer > 0 ? "hsl(172, 78%, 47%)" : "hsl(38, 88%, 52%)";
      ctx.fillRect(actionX - 50, actionY, steer * 60, 8);

      // Throttle indicator
      ctx.fillStyle = "hsl(220, 10%, 44%)";
      ctx.fillText("THROTTLE", actionX + 50, actionY - 8);
      ctx.fillStyle = "hsl(228, 13%, 15%)";
      ctx.fillRect(actionX + 20, actionY, 60, 8);
      ctx.fillStyle = "hsl(152, 68%, 42%)";
      ctx.fillRect(actionX + 20, actionY, throttle * 60, 8);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [running, sensorDist, sensorAngle, sensorVel, goalDist, showWeights, showActivations, showSignalFlow, animSpeed, forwardPass]);

  const controls = (
    <>
      <ControlSection title="Sensor Inputs">
        <SliderControl label="Distance" value={sensorDist} min={0} max={1} step={0.01} onChange={setSensorDist} color="hsl(172, 78%, 47%)" />
        <SliderControl label="Angle" value={sensorAngle} min={0} max={1} step={0.01} onChange={setSensorAngle} color="hsl(38, 88%, 52%)" />
        <SliderControl label="Velocity" value={sensorVel} min={0} max={1} step={0.01} onChange={setSensorVel} color="hsl(152, 68%, 42%)" />
        <SliderControl label="Goal Distance" value={goalDist} min={0} max={1} step={0.01} onChange={setGoalDist} color="hsl(212, 78%, 52%)" />
      </ControlSection>

      <ControlSection title="Visualization">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowWeights(!showWeights)} className={`sim-btn ${showWeights ? "sim-btn-active" : "sim-btn-inactive"}`}>Weights</button>
          <button onClick={() => setShowActivations(!showActivations)} className={`sim-btn ${showActivations ? "sim-btn-active" : "sim-btn-inactive"}`}>Activations</button>
          <button onClick={() => setShowSignalFlow(!showSignalFlow)} className={`sim-btn ${showSignalFlow ? "sim-btn-active" : "sim-btn-inactive"}`}>Signal Flow</button>
          <button onClick={() => setRunning(!running)} className={`sim-btn ${running ? "sim-btn-active" : "sim-btn-inactive"}`}>{running ? "⏸ Pause" : "▶ Run"}</button>
        </div>
        <SliderControl label="Animation Speed" value={animSpeed} min={0.1} max={3} step={0.1} unit="x" onChange={setAnimSpeed} color="hsl(268, 58%, 52%)" />
      </ControlSection>

      <ControlSection title="Network Architecture">
        <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
          {layerSizes.map((s, i) => (
            <div key={i} className="flex justify-between">
              <span>{layerLabels[i]}</span>
              <span className="text-foreground">{s} neurons</span>
            </div>
          ))}
          <div className="flex justify-between mt-2 pt-2 border-t border-border/30">
            <span>Total Parameters</span>
            <span className="text-primary">{layerSizes.reduce((acc, s, i) => i > 0 ? acc + s * layerSizes[i - 1] + s : acc, 0)}</span>
          </div>
        </div>
      </ControlSection>

      <ControlSection title="Guide" defaultOpen={false}>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This visualizes a <span className="text-primary">neural policy network</span> that maps sensor inputs to robot actions. 
          <span className="text-primary"> Green connections</span> are positive weights, <span className="text-destructive">red</span> are negative. 
          <span className="text-amber-glow"> Signal particles</span> show activation propagation. 
          Brighter neurons have higher activation. The output layer produces <span className="text-primary">steering</span> and <span className="text-green-glow">throttle</span> commands.
        </p>
      </ControlSection>
    </>
  );

  return (
    <SimLayout title="Neural Policy Brain" subtitle="Network · Activations · Signal Flow" controls={controls}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </SimLayout>
  );
};

export default NeuralPolicyVisualizer;
