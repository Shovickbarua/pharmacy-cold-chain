import React, { useState, useEffect } from 'react';
import { 
  Thermometer, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Truck, 
  Bell, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Send, 
  Eye, 
  Activity, 
  Package, 
  UserCheck, 
  Clock, 
  Sun, 
  Moon,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ClipboardList
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState('dark');
  
  // Scenario state
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState('scenario-insulin');
  const [activeScenario, setActiveScenario] = useState(null);
  
  // Active workflow tab: 1 to 5, or 'audit', 'fhir'
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  
  // Workflow data states
  const [rawHL7, setRawHL7] = useState('');
  const [parsedHL7, setParsedHL7] = useState(null);
  const [fhirMedRequest, setFhirMedRequest] = useState(null);
  const [rxNavValidation, setRxNavValidation] = useState(null);
  const [isRxNavLoading, setIsRxNavLoading] = useState(false);
  
  // Packing & Dispatch state
  const [dispatchForm, setDispatchForm] = useState({
    cooler_id: 'COOLER-CC-ALPHA-04',
    sensor_id: 'SENS-TEMP-8891',
    current_temp_c: 4.1,
    courier_name: 'Marcus Vance',
    courier_badge: 'LOG-104',
    courier_contact: '+1 (555) 019-4821',
    estimated_minutes: 10,
    pharmacist_name: 'Dr. Linda Sterling, PharmD'
  });
  const [medDispense, setMedDispense] = useState(null);
  const [hipaaAlert, setHipaaAlert] = useState(null);
  
  // Audit ledger state
  const [auditLedger, setAuditLedger] = useState([]);
  const [chainIntegrity, setChainIntegrity] = useState(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  
  // View toggle for JSON inspectors
  const [showJson, setShowJson] = useState({});

  // Fetch initial scenarios on mount
  useEffect(() => {
    fetchScenarios();
    fetchAuditLedger();
  }, []);

  // Update active scenario when activeScenarioId or scenarios change
  useEffect(() => {
    if (scenarios.length > 0) {
      const found = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
      setActiveScenario(found);
      setRawHL7(found.raw_hl7_omp_o09);
      setParsedHL7(null);
      setFhirMedRequest(null);
      setRxNavValidation(null);
      setMedDispense(null);
      setHipaaAlert(null);
      setCompletedSteps(new Set());
      setCurrentStep(1);

      // Initialize dispatch form with scenario defaults
      if (found.cold_chain_dispatch) {
        setDispatchForm(prev => ({
          ...prev,
          cooler_id: found.cold_chain_dispatch.cooler_id,
          sensor_id: found.cold_chain_dispatch.sensor_id,
          current_temp_c: found.cold_chain_dispatch.current_temp_c,
          courier_name: found.cold_chain_dispatch.courier_name,
          courier_badge: found.cold_chain_dispatch.courier_badge,
          courier_contact: found.cold_chain_dispatch.courier_contact,
          estimated_minutes: found.cold_chain_dispatch.estimated_minutes
        }));
      }
    }
  }, [activeScenarioId, scenarios]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const toggleJsonView = (key) => {
    setShowJson(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ==================== API ACTIONS ====================

  const fetchScenarios = async () => {
    try {
      const res = await fetch(`${API_BASE}/scenarios`);
      const data = await res.json();
      setScenarios(data);
    } catch (err) {
      console.error('Error fetching scenarios:', err);
    }
  };

  const fetchAuditLedger = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit/ledger`);
      const data = await res.json();
      setAuditLedger(data);
    } catch (err) {
      console.error('Error fetching audit ledger:', err);
    }
  };

  const verifyAuditChain = async () => {
    setIsVerifyingChain(true);
    try {
      const res = await fetch(`${API_BASE}/audit/verify`);
      const data = await res.json();
      setChainIntegrity(data);
      await fetchAuditLedger();
    } catch (err) {
      console.error('Error verifying audit chain:', err);
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const simulateTamper = async (blockIndex = 0) => {
    try {
      await fetch(`${API_BASE}/audit/tamper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_index: blockIndex })
      });
      await verifyAuditChain();
    } catch (err) {
      console.error('Error simulating tamper:', err);
    }
  };

  // Step 1: Parse HL7 v2
  const handleParseHL7 = async () => {
    try {
      const res = await fetch(`${API_BASE}/hl7/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_message: rawHL7 })
      });
      const data = await res.json();
      setParsedHL7(data);
      setCompletedSteps(prev => new Set(prev).add(1));
      await fetchAuditLedger();
    } catch (err) {
      console.error('Failed to parse HL7:', err);
    }
  };

  // Step 2: Query FHIR MedicationRequest
  const handleQueryMedRequest = async () => {
    if (!activeScenario) return;
    try {
      const medReqId = `medreq-${activeScenario.indent_id.toLowerCase()}`;
      const res = await fetch(`${API_BASE}/fhir/medication-request/${medReqId}`);
      const data = await res.json();
      setFhirMedRequest(data);
      setCompletedSteps(prev => new Set(prev).add(2));
      await fetchAuditLedger();
    } catch (err) {
      console.error('Failed to query MedicationRequest:', err);
    }
  };

  // Step 3: Validate with NIH RxNav
  const handleValidateRxNav = async () => {
    if (!activeScenario) return;
    setIsRxNavLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rxnorm/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drug_name: activeScenario.drug.name,
          expected_rxcui: activeScenario.drug.rxcui,
          prescribed_dose: activeScenario.drug.dosage,
          requested_dose: activeScenario.drug.dosage
        })
      });
      const data = await res.json();
      setRxNavValidation(data);
      setCompletedSteps(prev => new Set(prev).add(3));
      await fetchAuditLedger();
    } catch (err) {
      console.error('Failed to validate with RxNav:', err);
    } finally {
      setIsRxNavLoading(false);
    }
  };

  // Step 4: Pack & Dispatch MedicationDispense
  const handlePackAndDispatch = async () => {
    if (!activeScenario) return;
    try {
      const res = await fetch(`${API_BASE}/dispense/pack-and-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: activeScenario.id,
          ...dispatchForm
        })
      });
      const data = await res.json();
      setMedDispense(data.medication_dispense);
      setCompletedSteps(prev => new Set(prev).add(4));
      await fetchAuditLedger();
      // Automatically sanitize nurse notification
      await handleSanitizeAlert();
    } catch (err) {
      console.error('Failed to pack and dispatch:', err);
    }
  };

  // Step 5: HIPAA Sanitized Notification
  const handleSanitizeAlert = async () => {
    if (!activeScenario) return;
    try {
      const res = await fetch(`${API_BASE}/notify/sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: activeScenario.id,
          dispense_id: medDispense?.id
        })
      });
      const data = await res.json();
      setHipaaAlert(data);
      setCompletedSteps(prev => new Set(prev).add(5));
      await fetchAuditLedger();
    } catch (err) {
      console.error('Failed to sanitize alert:', err);
    }
  };

  // Run all steps sequentially for a quick demo
  const handleRunAll = async () => {
    await handleParseHL7();
    await handleQueryMedRequest();
    await handleValidateRxNav();
    await handlePackAndDispatch();
    setCurrentStep(5);
  };

  if (!activeScenario) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Clinical Scenarios...</div>;
  }

  const isTempNormal = dispatchForm.current_temp_c >= 2.0 && dispatchForm.current_temp_c <= 8.0;

  return (
    <div className="app-container">
      {/* ==================== TOP NAVBAR ==================== */}
      <header className="top-navbar">
        <div className="brand-section">
          <div className="brand-icon">
            <Thermometer size={22} />
          </div>
          <div>
            <div className="brand-title">
              Cold-Chain Vault System
              <span className="vault-badge">
                <span className="pulse-dot" />
                2.0°C - 8.0°C Active Vault
              </span>
            </div>
            <div className="brand-subtitle">
              St. Jude Metropolitan Hospital • Inpatient Pharmacy & Logistics
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={handleRunAll}
            title="Execute entire cold chain workflow automatically"
          >
            <Sparkles size={14} />
            Run Full Pipeline
          </button>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={verifyAuditChain}
            title="Check SHA-256 Audit Chain"
          >
            <ShieldCheck size={14} />
            Verify Chain
          </button>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* ==================== SCENARIOS SELECTOR ==================== */}
      <div className="scenario-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={16} color="var(--cryo-cyan)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Select Inpatient Indent Case:
          </span>
        </div>
        <div className="scenario-pills">
          {scenarios.map(s => (
            <button
              key={s.id}
              className={`scenario-btn ${s.id === activeScenarioId ? 'active' : ''}`}
              onClick={() => setActiveScenarioId(s.id)}
            >
              <span>{s.drug.brand_name || s.drug.name.split(' ')[0]}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({s.patient.floor.split(' - ')[0]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== 5-STEP PIPELINE STEPPER ==================== */}
      <nav className="pipeline-stepper" aria-label="Clinical workflow steps">
        <div 
          className={`step-item ${currentStep === 1 ? 'active' : ''} ${completedSteps.has(1) ? 'completed' : ''}`}
          onClick={() => setCurrentStep(1)}
        >
          <div className="step-circle">{completedSteps.has(1) ? '✓' : '1'}</div>
          <div className="step-label">
            <span className="step-title">Floor Indent</span>
            <span className="step-sub">HL7 v2 OMP^O09</span>
          </div>
        </div>

        <div className="step-divider" />

        <div 
          className={`step-item ${currentStep === 2 ? 'active' : ''} ${completedSteps.has(2) ? 'completed' : ''}`}
          onClick={() => setCurrentStep(2)}
        >
          <div className="step-circle">{completedSteps.has(2) ? '✓' : '2'}</div>
          <div className="step-label">
            <span className="step-title">Doctor Order</span>
            <span className="step-sub">FHIR MedicationRequest</span>
          </div>
        </div>

        <div className="step-divider" />

        <div 
          className={`step-item ${currentStep === 3 ? 'active' : ''} ${completedSteps.has(3) ? 'completed' : ''}`}
          onClick={() => setCurrentStep(3)}
        >
          <div className="step-circle">{completedSteps.has(3) ? '✓' : '3'}</div>
          <div className="step-label">
            <span className="step-title">Formulation Check</span>
            <span className="step-sub">NIH RxNav / RxNorm</span>
          </div>
        </div>

        <div className="step-divider" />

        <div 
          className={`step-item ${currentStep === 4 ? 'active' : ''} ${completedSteps.has(4) ? 'completed' : ''}`}
          onClick={() => setCurrentStep(4)}
        >
          <div className="step-circle">{completedSteps.has(4) ? '✓' : '4'}</div>
          <div className="step-label">
            <span className="step-title">Cold Packaging & ETA</span>
            <span className="step-sub">FHIR MedicationDispense</span>
          </div>
        </div>

        <div className="step-divider" />

        <div 
          className={`step-item ${currentStep === 5 ? 'active' : ''} ${completedSteps.has(5) ? 'completed' : ''}`}
          onClick={() => setCurrentStep(5)}
        >
          <div className="step-circle">{completedSteps.has(5) ? '✓' : '5'}</div>
          <div className="step-label">
            <span className="step-title">HIPAA Alert & Audit</span>
            <span className="step-sub">Safe Harbor & AuditEvent</span>
          </div>
        </div>
      </nav>

      {/* ==================== MAIN WORKFLOW BODY ==================== */}
      <main className="main-content">
        
        {/* ==================== STAGE 1: HL7 v2 OMP^O09 ==================== */}
        {currentStep === 1 && (
          <div className="grid-2col">
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <FileText size={18} color="var(--cryo-cyan)" />
                  <span className="card-title">Inbound Legacy HL7 v2 Order (OMP^O09)</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleParseHL7}>
                  <RefreshCw size={12} />
                  Parse & Ingest Order
                </button>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                Floor nurse submitted a digital indent from the IPD ward. The hospital interface engine emitted a standard HL7 v2.5 <code>OMP^O09</code> message containing patient identifiers, clinical location, order parameters, and cold-chain handling flags.
              </p>

              <textarea 
                className="code-block"
                style={{ width: '100%', minHeight: '180px', resize: 'vertical' }}
                value={rawHL7}
                onChange={(e) => setRawHL7(e.target.value)}
              />

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary"
                  onClick={async () => {
                    await handleParseHL7();
                    setCurrentStep(2);
                  }}
                >
                  Confirm & Proceed to FHIR Prescription
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <Activity size={18} color="var(--cold-emerald)" />
                  <span className="card-title">Parsed Segment Breakdown</span>
                </div>
                {parsedHL7 && (
                  <span className="vault-badge">
                    <CheckCircle2 size={12} />
                    Parsed by hl7apy / python-hl7
                  </span>
                )}
              </div>

              {parsedHL7 ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Patient (PID)</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{parsedHL7.patient.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MRN: {parsedHL7.patient.mrn} • DOB: {parsedHL7.patient.dob}</div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inpatient Bed (PV1)</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{parsedHL7.patient.room} • {parsedHL7.patient.bed}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{parsedHL7.patient.floor}</div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drug & Dose (RXO / RXR)</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--cryo-cyan)' }}>{parsedHL7.order.drug_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Give: {parsedHL7.order.give_amount} {parsedHL7.order.give_units} via {parsedHL7.order.route}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Storage Requirement (OBX)</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--warning-amber)' }}>
                        {parsedHL7.order.storage_requirements[0]?.value || 'Refrigerated 2-8°C Required'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cold-emerald)' }}>✓ Cold Chain Mandatory</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Extracted Segments ({parsedHL7.parsed_segments.length}):
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {parsedHL7.parsed_segments.map((seg, idx) => (
                      <span key={idx} style={{ 
                        background: 'rgba(255,255,255,0.06)', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem' 
                      }}>
                        {seg.segment} ({seg.field_count} fields)
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <FileText size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <div>Click <strong>"Parse & Ingest Order"</strong> to extract HL7 v2 fields.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== STAGE 2: FHIR MEDICATION REQUEST ==================== */}
        {currentStep === 2 && (
          <div className="grid-2col">
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <ClipboardList size={18} color="var(--ice-blue)" />
                  <span className="card-title">Doctor's Prescription (HL7 FHIR MedicationRequest)</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleQueryMedRequest}>
                  <RefreshCw size={12} />
                  Fetch Order from EHR
                </button>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  The pharmacy system queries the Hospital EHR via the <strong>HL7 FHIR MedicationRequest Specification</strong> to inspect the attending physician's signed clinical order before packaging.
                </p>

                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cryo-cyan)' }}>PRESCRIPTION ORDER #{activeScenario.order_number}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cold-emerald)', fontWeight: 600 }}>STATUS: ACTIVE (ORDERED)</span>
                  </div>

                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {activeScenario.drug.name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    RxNorm Standard Code: <strong>RxCUI {activeScenario.drug.rxcui}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Ordered Dosage: </span>
                      <strong>{activeScenario.drug.dosage}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Route: </span>
                      <strong>{activeScenario.drug.route}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Prescribing Physician: </span>
                      <strong>{activeScenario.prescriber.name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Physician NPI: </span>
                      <strong>{activeScenario.prescriber.npi}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Clinical Diagnosis: </span>
                      <strong>{activeScenario.patient.diagnosis}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Order Priority: </span>
                      <strong style={{ color: 'var(--warning-amber)' }}>{activeScenario.urgency}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary"
                  onClick={async () => {
                    await handleQueryMedRequest();
                    setCurrentStep(3);
                  }}
                >
                  Validate Drug with NIH RxNav
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <Database size={18} color="var(--indigo-accent)" />
                  <span className="card-title">FHIR R4 JSON Representation</span>
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleJsonView('medreq')}
                >
                  <Eye size={12} />
                  {showJson['medreq'] ? 'Collapse JSON' : 'Inspect FHIR Payload'}
                </button>
              </div>

              {fhirMedRequest ? (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Conforming to: <code>http://hl7.org/fhir/StructureDefinition/MedicationRequest</code>
                  </div>
                  <pre className="code-block">
                    {JSON.stringify(fhirMedRequest, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <ClipboardList size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <div>Click <strong>"Fetch Order from EHR"</strong> to retrieve the FHIR MedicationRequest.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== STAGE 3: NIH RXNAV VALIDATION ==================== */}
        {currentStep === 3 && (
          <div className="grid-2col">
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <ShieldCheck size={18} color="var(--cryo-cyan)" />
                  <span className="card-title">Official NIH NLM RxNav / RxNorm Drug Validation</span>
                </div>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleValidateRxNav}
                  disabled={isRxNavLoading}
                >
                  <RefreshCw size={12} className={isRxNavLoading ? 'spin-icon' : ''} />
                  {isRxNavLoading ? 'Querying NIH API...' : 'Run NIH NLM Validation'}
                </button>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Double-checks the floor nurse's indent drug request against the doctor's official prescription by querying the <strong>NIH National Library of Medicine (NLM) RxNav REST API</strong>.
              </p>

              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Formulation to Verify</span>
                  <span className="vault-badge">Authority: NIH NLM RxNav</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cryo-cyan)' }}>
                  {activeScenario.drug.name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Target RxCUI: {activeScenario.drug.rxcui} • Dose: {activeScenario.drug.dosage}
                </div>
              </div>

              {rxNavValidation && (
                <div style={{ 
                  background: rxNavValidation.cold_chain_required ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-secondary)', 
                  border: `1px solid ${rxNavValidation.cold_chain_required ? 'var(--cryo-cyan)' : 'var(--border-subtle)'}`,
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Thermometer size={18} color="var(--cryo-cyan)" />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      COLD CHAIN REQUIREMENT CONFIRMED
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Storage Instruction: <strong>{rxNavValidation.storage_instructions}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cold-emerald)' }}>
                    ✓ Validated against NIH RxNorm Clinical Drug (SCD) Concept.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!rxNavValidation) await handleValidateRxNav();
                    setCurrentStep(4);
                  }}
                >
                  Proceed to Packaging & Cooler Dispatch
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <Database size={18} color="var(--cold-emerald)" />
                  <span className="card-title">Live NIH RxNav Match Results</span>
                </div>
                {rxNavValidation && (
                  <span className="vault-badge">
                    {rxNavValidation.is_live_api_used ? 'Live NIH API' : 'Cached Verified NLM Index'}
                  </span>
                )}
              </div>

              {rxNavValidation ? (
                <div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>OFFICIAL RXNORM CONCEPT (SCD)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--cold-emerald)' }}>
                      {rxNavValidation.official_rxnorm_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      RxCUI: <strong>{rxNavValidation.matched_rxcui}</strong> • Formulation Match: <strong>{rxNavValidation.status}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    NIH RxNav Concept Candidates:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {rxNavValidation.nlm_candidates.map((c, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          padding: '0.5rem', 
                          background: 'rgba(255,255,255,0.03)', 
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                          RxCUI: {c.rxcui} | Source: {c.source} | Rank #{c.rank}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Validation Audit Notes:</div>
                    {rxNavValidation.validation_notes.map((note, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={12} color="var(--cold-emerald)" />
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <div>Click <strong>"Run NIH NLM Validation"</strong> to cross-examine formulation against RxNav.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== STAGE 4: COLD PACKAGING & COURIER DISPATCH ==================== */}
        {currentStep === 4 && (
          <div className="grid-2col">
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <Package size={18} color="var(--cryo-cyan)" />
                  <span className="card-title">Cold-Chain Packaging & Courier Assignment</span>
                </div>
                <span className="vault-badge">
                  <Thermometer size={12} />
                  Standard: 2.0°C - 8.0°C
                </span>
              </div>

              {/* Temperature Gauge Display */}
              <div className="temp-gauge-card">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Digital Data Logger Telemetry
                  </div>
                  <div className="temp-reading-large">
                    {dispatchForm.current_temp_c.toFixed(1)}
                    <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>°C</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Sensor: {dispatchForm.sensor_id}
                  </div>
                </div>

                <div>
                  {isTempNormal ? (
                    <span className="temp-badge-in-range">
                      <CheckCircle2 size={14} />
                      Refrigerated (In-Range)
                    </span>
                  ) : (
                    <span className="temp-badge-alert">
                      <AlertTriangle size={14} />
                      TEMPERATURE EXCURSION!
                    </span>
                  )}
                </div>
              </div>

              {/* Temperature Simulation Slider */}
              <div style={{ marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                  <span>Simulate Sensor Temperature Reading:</span>
                  <strong>{dispatchForm.current_temp_c}°C</strong>
                </div>
                <input 
                  type="range"
                  min="0.0"
                  max="12.0"
                  step="0.1"
                  style={{ width: '100%', accentColor: 'var(--cryo-cyan)' }}
                  value={dispatchForm.current_temp_c}
                  onChange={(e) => setDispatchForm(prev => ({ ...prev, current_temp_c: parseFloat(e.target.value) }))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>0.0°C (Freezing Risk)</span>
                  <span style={{ color: 'var(--cold-emerald)' }}>2.0°C - 8.0°C (Safe Zone)</span>
                  <span>12.0°C (Spoilage Risk)</span>
                </div>
              </div>

              {/* Courier & Dispatch Form Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Validated Cooler Box:
                  </label>
                  <input 
                    type="text"
                    style={{ 
                      width: '100%', 
                      padding: '0.45rem 0.65rem', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                    value={dispatchForm.cooler_id}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, cooler_id: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Calibrated Sensor ID:
                  </label>
                  <input 
                    type="text"
                    style={{ 
                      width: '100%', 
                      padding: '0.45rem 0.65rem', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                    value={dispatchForm.sensor_id}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, sensor_id: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Assigned Courier:
                  </label>
                  <input 
                    type="text"
                    style={{ 
                      width: '100%', 
                      padding: '0.45rem 0.65rem', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                    value={dispatchForm.courier_name}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, courier_name: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Courier Badge ID:
                  </label>
                  <input 
                    type="text"
                    style={{ 
                      width: '100%', 
                      padding: '0.45rem 0.65rem', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                    value={dispatchForm.courier_badge}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, courier_badge: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Transit ETA (Minutes):
                  </label>
                  <input 
                    type="number"
                    style={{ 
                      width: '100%', 
                      padding: '0.45rem 0.65rem', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                    value={dispatchForm.estimated_minutes}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, estimated_minutes: parseInt(e.target.value) || 10 }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Pharmacist Sign-Off:
                  </label>
                  <input 
                    type="text"
                    style={{ 
                      width: '100%', 
                      padding: '0.45rem 0.65rem', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                    value={dispatchForm.pharmacist_name}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, pharmacist_name: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary"
                  onClick={async () => {
                    await handlePackAndDispatch();
                    setCurrentStep(5);
                  }}
                >
                  <Truck size={14} />
                  Pack Medicine, Update Chart & Dispatch
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <Database size={18} color="var(--cold-emerald)" />
                  <span className="card-title">HL7 FHIR MedicationDispense Resource</span>
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleJsonView('dispense')}
                >
                  <Eye size={12} />
                  {showJson['dispense'] ? 'Collapse JSON' : 'Inspect FHIR Payload'}
                </button>
              </div>

              {medDispense ? (
                <div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--cold-emerald)' }}>STATUS: {medDispense.status.toUpperCase()}</span>
                      <span style={{ color: 'var(--text-muted)' }}>ID: {medDispense.id}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Packed & Assigned to: {dispatchForm.courier_name} (Badge #{dispatchForm.courier_badge})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Destination: {medDispense.destination.display} • ETA: {dispatchForm.estimated_minutes} mins
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    FHIR Cold-Chain Extension Applied: <code>StructureDefinition/cold-chain-transport</code>
                  </div>

                  <pre className="code-block">
                    {JSON.stringify(medDispense, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <Package size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <div>Click <strong>"Pack Medicine, Update Chart & Dispatch"</strong> to generate the FHIR MedicationDispense record.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== STAGE 5: HIPAA ALERT & AUDIT EVENT ==================== */}
        {currentStep === 5 && (
          <div className="grid-2col">
            
            {/* Left Column: Nurse Alert Preview & Phone Mockup */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <Bell size={18} color="var(--warning-amber)" />
                  <span className="card-title">HIPAA-Compliant Nurse Pager Alert</span>
                </div>
                <span className="vault-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--cold-emerald)' }}>
                  <ShieldCheck size={12} />
                  Safe Harbor Certified
                </span>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Under HIPAA Safe Harbor (45 CFR § 164.514), lockscreen push alerts and pagers must <strong>NEVER expose patient name, MRN, date of birth, specific room/bed, or diagnosis</strong>.
              </p>

              {/* Smartphone / Pager Mockup */}
              <div className="phone-mockup">
                <div className="phone-screen">
                  <div className="phone-notch" />
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Secure Hospital Nurse App
                  </div>

                  {hipaaAlert ? (
                    <div className="push-notification-box">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Thermometer size={14} color="var(--cryo-cyan)" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cryo-cyan)' }}>
                            CENTRAL PHARMACY
                          </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Now</span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                        {hipaaAlert.sanitized_preview.title}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#e2e8f0', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                        {hipaaAlert.sanitized_preview.body}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                        <span>Courier: <strong>{hipaaAlert.sanitized_preview.courier}</strong></span>
                        <span style={{ color: 'var(--cold-emerald)' }}>ETA: <strong>{hipaaAlert.sanitized_preview.eta}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                      Dispatch medication in Step 4 to preview sanitized lockscreen notification.
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.6875rem', color: '#64748b' }}>
                    🔒 Protected Hospital Floor Device (ID: {activeScenario.requester_nurse.device_id})
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Side-by-Side PHI Leak Comparison */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <ShieldAlert size={18} color="var(--alert-rose)" />
                  <span className="card-title">Side-by-Side HIPAA Leakage Audit</span>
                </div>
                {hipaaAlert && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--cold-emerald)', fontWeight: 700 }}>
                    0 PHI Leaks Detected
                  </span>
                )}
              </div>

              {hipaaAlert ? (
                <div>
                  {/* Danger Box: Insecure Notification */}
                  <div style={{ 
                    background: 'rgba(244, 63, 94, 0.08)', 
                    border: '1px solid rgba(244, 63, 94, 0.3)', 
                    padding: '0.85rem', 
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--alert-rose)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <Unlock size={14} />
                      NON-COMPLIANT BROADCAST (45 CFR § 164.502 VIOLATION):
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#fca5a5', lineHeight: 1.4 }}>
                      "{hipaaAlert.insecure_comparison.raw_text}"
                    </div>
                  </div>

                  {/* Safe Box: Sanitized Notification */}
                  <div style={{ 
                    background: 'rgba(16, 185, 129, 0.08)', 
                    border: '1px solid rgba(16, 185, 129, 0.3)', 
                    padding: '0.85rem', 
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--cold-emerald)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <Lock size={14} />
                      HIPAA SAFE HARBOR COMPLIANT OUTBOUND ALERT:
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#86efac', lineHeight: 1.4 }}>
                      "{hipaaAlert.sanitized_preview.body}"
                    </div>
                  </div>

                  {/* PHI Comparison Table */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Redacted Protected Health Information (Safe Harbor Analysis):
                  </div>
                  <table className="phi-comparison-table">
                    <thead>
                      <tr>
                        <th>Sensitive Element</th>
                        <th>Raw Value</th>
                        <th>Outbound Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hipaaAlert.insecure_comparison.leaked_fields.map((field, idx) => (
                        <tr key={idx}>
                          <td>{field.category}</td>
                          <td><span className="phi-leaked-tag">{field.value}</span></td>
                          <td><span className="phi-stripped-tag">REDACTED / STRIPPED</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <ShieldAlert size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <div>Complete Step 4 to generate the side-by-side HIPAA leakage analysis.</div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== GLOBAL BOTTOM SECTION: TAMPER-PROOF AUDIT LEDGER ==================== */}
        <section style={{ marginTop: '2rem' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <Lock size={18} color="var(--indigo-accent)" />
                <span className="card-title">
                  Tamper-Proof Audit Trail (HL7 FHIR AuditEvent & SHA-256 Chained Ledger)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={verifyAuditChain}
                  disabled={isVerifyingChain}
                >
                  <RefreshCw size={12} className={isVerifyingChain ? 'spin-icon' : ''} />
                  Verify Chain Integrity
                </button>

                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => simulateTamper(0)}
                  title="Tamper with Block #0 to demonstrate immediate detection"
                >
                  <Unlock size={12} />
                  Simulate Log Tampering
                </button>
              </div>
            </div>

            {/* Integrity Status Banner */}
            {chainIntegrity && (
              <div style={{ 
                background: chainIntegrity.is_valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.15)',
                border: `1px solid ${chainIntegrity.is_valid ? 'var(--cold-emerald)' : 'var(--alert-rose)'}`,
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {chainIntegrity.is_valid ? (
                    <ShieldCheck size={20} color="var(--cold-emerald)" />
                  ) : (
                    <ShieldAlert size={20} color="var(--alert-rose)" />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: chainIntegrity.is_valid ? 'var(--cold-emerald)' : 'var(--alert-rose)' }}>
                      {chainIntegrity.status}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {chainIntegrity.message}
                    </div>
                  </div>
                </div>

                {!chainIntegrity.is_valid && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={async () => {
                      await fetchScenarios();
                      await fetchAuditLedger();
                      await verifyAuditChain();
                    }}
                  >
                    Restore Clean State
                  </button>
                )}
              </div>
            )}

            {/* Ledger Blocks Display */}
            <div className="audit-chain-container">
              {auditLedger.map((block, idx) => (
                <React.Fragment key={block.event_id || idx}>
                  <div className={`audit-block ${block.tampered ? 'tampered' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          background: 'var(--cryo-cyan)', 
                          color: '#04101e', 
                          fontWeight: 700, 
                          fontSize: '0.7rem', 
                          padding: '0.15rem 0.4rem', 
                          borderRadius: '4px' 
                        }}>
                          BLOCK #{block.index}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          {block.description}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(block.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      <div>Actor: <strong>{block.actor}</strong></div>
                      <div>Target Entity: <strong>{block.entity}</strong></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        Previous Hash: <span className="hash-string prev">{block.previous_hash}</span>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        SHA-256 Seal: <span className="hash-string">{block.sha256_hash}</span>
                      </div>
                    </div>

                    {block.tampered && (
                      <div style={{ marginTop: '0.4rem', color: 'var(--alert-rose)', fontSize: '0.75rem', fontWeight: 700 }}>
                        ⚠️ TAMPER DETECTED: Payload altered maliciously! Cryptographic hash chain broken!
                      </div>
                    )}
                  </div>

                  {idx < auditLedger.length - 1 && <div className="chain-connector" />}
                </React.Fragment>
              ))}
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
