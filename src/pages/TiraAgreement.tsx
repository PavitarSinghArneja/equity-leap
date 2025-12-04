import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// TIRA Agreement - Professional document with PDF download and signature functionality
const TiraAgreement: React.FC = () => {
  const [isSigned, setIsSigned] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;

    setIsDownloading(true);
    try {
      // Small delay to ensure DOM is fully rendered with current state (signed or unsigned)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create canvas from the document - this captures the current state including signature if signed
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Add multiple pages if content is long
      let heightLeft = imgHeight * ratio;
      let position = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      // Include signature status in filename
      const filename = isSigned
        ? 'Tira-Agreement-RS-TRR-2025-001-SIGNED.pdf'
        : 'Tira-Agreement-RS-TRR-2025-001.pdf';

      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSignAcceptance = () => {
    setIsSigned(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Action Buttons */}
        <div className="mb-6 flex justify-end gap-3">
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>

        {/* Document */}
        <div
          ref={documentRef}
          className="bg-white shadow-lg p-12 space-y-5"
          style={{
            fontFamily: 'Georgia, serif',
            lineHeight: '1.6',
            color: '#1a1a1a'
          }}
        >
          {/* Header - Date, Reference, To */}
          <div className="space-y-1">
            <p className="text-base"><strong>DATE:</strong> December 4th, 2025 <strong>REFERENCE:</strong> RS-TRR-2025-001 <strong>TO:</strong> The Directors/Partners, Tira Riverfront Retreat LLP</p>
          </div>

          <div>
            <p className="text-base"><strong>PROJECT LOCATION:</strong> Sita River, Udupi, Barkur</p>
          </div>

          <div>
            <p className="text-base"><strong>FROM:</strong> Retreat Slice LLP</p>
          </div>

          {/* Subject */}
          <div className="py-2">
            <p className="font-bold text-base">
              SUBJECT: LETTER OF COMMITMENT & STRATEGIC PARTNERSHIP FRAMEWORK
            </p>
          </div>

          {/* Opening */}
          <div className="space-y-4">
            <p>Dear Partners,</p>
            <p>
              Following our recent discussions regarding the riverfront development at <strong>Sita River, Udupi, Barkur</strong>, Retreat Slice LLP is pleased to formally submit this Letter of Commitment. We are excited to onboard Tira Riverfront Retreat LLP ("The Landowner Entity") onto the <strong>Retreat Slice</strong> platform.
            </p>
            <p>
              This letter outlines the operational framework, financial commitments, and distinct roles required to transform this asset into a high-yielding fractional ownership retreat. We are committed to acting as your <strong>Technology and Platform Partner</strong>, providing the digital infrastructure, brand visibility, and investor interface required to fund and market this project.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="font-bold text-base">1. SCOPE OF PARTNERSHIP & ROLES</h2>
            <ul className="list-disc ml-8 space-y-3">
              <li>
                <strong>Retreat Slice LLP (The Platform):</strong> We shall <strong>take the responsibility of acting</strong> as the customer-facing technology interface. We are responsible for aggregating potential investors, maintaining digital transparency (displaying BOQs, Capex, Opex, and cash flows), and managing the investor community. We will facilitate <strong>and manage</strong> a secondary market infrastructure to allow liquidity for investors wishing to exit.
              </li>
              <li>
                <strong>Tira Riverfront Retreat LLP (The Landowner/Developer):</strong> You retain full liability for the physical execution of the project, including land acquisition (if pending), construction quality, adherence to timelines, and the eventual appointment of the hospitality operator.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="font-bold text-base">2. FINANCIAL COMMITMENT & FUND MANAGEMENT</h2>
            <ul className="list-disc ml-8 space-y-3">
              <li>
                <strong>Escrow Mechanism:</strong> To ensure absolute trust <strong>to the</strong> investors, all capital raised via Retreat Slice will be deposited into a regulated Escrow Account (via partners such as Razorpay or Slice). <em>The Escrow Account will be structured with joint oversight to ensure transparency. However, funds shall be released expeditiously upon milestone completion to ensure the smooth progress of construction and prevent delays.</em>
              </li>
              <li>
                <strong>Stage-Wise Disbursement:</strong> Funds will not be released purely on raising; they will be released to the Landowner's account strictly upon the completion of defined construction milestones. This protects our stakeholders and incentivizes project velocity.
              </li>
              <li>
                <strong>Platform Fees:</strong> Retreat Slice LLP shall charge a <strong>5% commission</strong> on the total funds raised through our platform for our services in technology, marketing, and investor relations. <em>(Benchmarked to industry standards for full-stack fundraising & tech infrastructure).</em>
              </li>
              <li>
                <strong>Secondary Market Fees:</strong> We will maintain a pool of secondary buyers to provide liquidity. For this service, we charge a <strong>2% flat commission</strong> to the exiting investor upon the sale of their stake.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="font-bold text-base">3. RETURNS & LIABILITY</h2>
            <ul className="list-disc ml-8 space-y-3">
              <li>
                <strong>ROI Structure:</strong> We <strong>project returns of 15%</strong>. This figure shall be further ratified as a formal commitment from the Landowner Entity directly to the investors. The Landowner Entity is liable for ensuring the project is operational and generating revenue.
              </li>
              <li>
                <strong>Flow of Funds:</strong> Returns generated from the resort operations shall be collected by the Landowner/Operator and remitted to <strong>the Escrow Account</strong>. We will purely act as the intermediary to <strong>facilitate</strong> these returns to the stakeholders on a pro-rata basis.
              </li>
              <li>
                <strong>Regulatory Stance:</strong> While we operate currently as a transparency-first proprietary platform, we intend to apply for a SEBI license upon reaching our internal regulatory thresholds. Until such time, trust is maintained through the complete visibility of documentation and the "SPV" (Special Purpose Vehicle) structure formed for this project.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="font-bold text-base">4. PROJECT & STAKEHOLDER BENEFITS</h2>
            <p className="ml-4">
              We commit to presenting your project with full transparency to build a "sentimental connection" with investors. Beyond financial ROI, stakeholders will be entitled to discounted stays and <strong>assist in</strong> decision-making processes, creating a loyal community for the Tira Riverfront Retreat.
            </p>
            <p className="ml-4">
              We view this strictly as a collaboration. <strong>We agree to</strong> maintaining your entity as the primary beneficiary of funds, provided the construction and financial commitments to the investors are met with precision <strong>within mutually agreed permissible time frame</strong>
            </p>
          </div>

          {/* Closing */}
          <div className="pt-4 space-y-4">
            <p>
              Please sign below to acknowledge these terms as the foundation of our definitive agreement.
            </p>
            <p>Sincerely,</p>
            <div className="mt-12 mb-8">
              <p className="text-sm mb-1">(Signature)</p>
              <div className="border-t border-gray-400 w-80 pt-2">
                <p className="font-semibold">Designated Partner Retreat Slice LLP</p>
              </div>
            </div>
          </div>

          {/* Acceptance Section */}
          <div className="border-t-2 border-gray-300 pt-6 space-y-4">
            <h3 className="font-bold text-base">ACCEPTED AND AGREED:</h3>
            <p>
              We, Tira Riverfront Retreat LLP, acknowledge the terms above and accept liability for the project milestones and investor return commitments as outlined.
            </p>

            <div className="mt-8">
              {isSigned ? (
                <div className="space-y-2">
                  <p className="text-sm">(Signature)</p>
                  <div className="border-t border-gray-400 w-80 pt-2">
                    <p className="font-bold text-lg">Tira Riverfront Retreat LLP</p>
                    <p className="text-sm text-gray-600 mt-1">Authorized Signatory</p>
                    <div className="flex items-center gap-2 mt-3 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-semibold">Signed and Accepted</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">(Signature)</p>
                  <div className="border-t border-gray-400 w-80 pt-2">
                    <p className="font-semibold text-gray-400">Authorized Signatory Tira Riverfront Retreat LLP</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sign Acceptance Button */}
        {!isSigned && (
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleSignAcceptance}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary shadow-lg text-lg px-12 py-6"
            >
              Click to Sign Acceptance
            </Button>
          </div>
        )}

        {isSigned && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-6 py-3 rounded-lg border border-green-200">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Agreement Signed Successfully</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TiraAgreement;
