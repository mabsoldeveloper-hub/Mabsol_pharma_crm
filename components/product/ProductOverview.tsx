// export default function ProductOverview({ product }: any) {

//     return (
  
//       <div className="card shadow mt-3">
  
//         <div className="card-header">
  
//           Product Details
  
//         </div>
  
//         <div className="card-body">
  
//           <p><b>Company :</b> {product.GCODE}</p>
  
//           <p><b>MRP :</b> {product.MRP}</p>
  
//           <p><b>Purchase :</b> {product.PRATE}</p>
  
//           <p><b>Sale :</b> {product.RATEF}</p>
  
//         </div>
  
//       </div>
  
//     );
  
//   }
"use client";

export default function ProductOverview({ product }: any) {

    const show = (value: any) => {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "-";
        }

        return value;
    };

    const money = (value: any) => {

        return Number(value || 0).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
        });

    };

    return (

        <>

            {/* ==================================================== */}
            {/* BASIC INFORMATION */}
            {/* ==================================================== */}

            <div className="card shadow mt-3">

                <div className="card-header bg-primary text-white">

                    <h5 className="mb-0">

                        Basic Information

                    </h5>

                </div>

                <div className="card-body">

                    <div className="row">

                        <div className="col-md-4 mb-3">

                            <b>Product Name</b>

                            <div>{show(product.PRODUCT)}</div>

                        </div>

                        <div className="col-md-2 mb-3">

                            <b>Code</b>

                            <div>{show(product.CODE)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Company</b>

                            <div>{show(product.companyName || product.GCODE)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Status</b>

                            <div>

                                {

                                    product.STATUS == "Y"

                                        ?

                                        <span className="badge bg-success">

                                            Active

                                        </span>

                                        :

                                        <span className="badge bg-danger">

                                            Inactive

                                        </span>

                                }

                            </div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Unit</b>

                            <div>{show(product.UNIT)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Second Unit</b>

                            <div>{show(product.UNIT2)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Packing</b>

                            <div>{show(product.PACKING)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Pack Qty</b>

                            <div>{show(product.PACK)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>HSN / SAC</b>

                            <div>{show(product.HSN)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>UPC Code</b>

                            <div>{show(product.UPCCODE)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Rack No.</b>

                            <div>{show(product.RACKNO)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Rack No. 2</b>

                            <div>{show(product.RACKNO2)}</div>

                        </div>

                    </div>

                </div>

            </div>

                        {/* ==================================================== */}
            {/* PRICING */}
            {/* ==================================================== */}

            <div className="card shadow mt-3">

                <div className="card-header bg-success text-white">

                    <h5 className="mb-0">

                        Pricing Information

                    </h5>

                </div>

                <div className="card-body">

                    <div className="row">

                        <div className="col-md-3 mb-3">
                            <b>MRP</b>
                            <div>₹ {money(product.MRP)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Purchase Rate</b>
                            <div>₹ {money(product.PRATE)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Sale Rate</b>
                            <div>₹ {money(product.RATEF)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Last Purchase Rate</b>
                            <div>₹ {money(product.LPRATE)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Cost / PCS</b>
                            <div>₹ {money(product.COST)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Rate A</b>
                            <div>₹ {money(product.RATEA)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Rate B</b>
                            <div>₹ {money(product.RATEB)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Rate C</b>
                            <div>₹ {money(product.RATEC)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Rate D</b>
                            <div>₹ {money(product.RATED)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Rate E</b>
                            <div>₹ {money(product.RATEE)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Rate F</b>
                            <div>₹ {money(product.RATEF)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Rate G</b>
                            <div>₹ {money(product.RATEG)}</div>
                        </div>

                    </div>

                </div>

            </div>

            {/* ==================================================== */}
            {/* GST / TAX */}
            {/* ==================================================== */}

            <div className="card shadow mt-3">

                <div className="card-header bg-warning">

                    <h5 className="mb-0">

                        GST / Tax Information

                    </h5>

                </div>

                <div className="card-body">

                    <div className="row">

                        <div className="col-md-3 mb-3">

                            <b>CGST</b>

                            <div>{show(product.CGST)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>SGST</b>

                            <div>{show(product.CGST)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>IGST</b>

                            <div>{show(product.IGST)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Purchase Tax</b>

                            <div>{show(product.PURTAX)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Sale Tax</b>

                            <div>{show(product.SALTAX)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Tax Type</b>

                            <div>{show(product.TAXL)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Tax Category</b>

                            <div>{show(product.TAXC)}</div>

                        </div>

                    </div>

                </div>

            </div>

                        {/* ==================================================== */}
            {/* STOCK INFORMATION */}
            {/* ==================================================== */}

            <div className="card shadow mt-3">

                <div className="card-header bg-info text-white">

                    <h5 className="mb-0">

                        Stock Information

                    </h5>

                </div>

                <div className="card-body">

                    <div className="row">

                        <div className="col-md-3 mb-3">

                            <b>Current Stock</b>

                            <div>{show(product.BALANCE)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Opening Stock</b>

                            <div>{show(product.OPENING)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>On Qty</b>

                            <div>{show(product.ONQTY)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Free Qty</b>

                            <div>{show(product.ONQTYFREE)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Free Balance</b>

                            <div>{show(product.FREEBAL)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Hold Stock</b>

                            <div>{show(product.HOLD)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Minimum Stock</b>

                            <div>{show(product.MINIMUM)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Maximum Stock</b>

                            <div>{show(product.MAXIMUM)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Total Qty</b>

                            <div>{show(product.TQTY)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Qty</b>

                            <div>{show(product.QTY)}</div>

                        </div>

                    </div>

                </div>

            </div>


            {/* ==================================================== */}
            {/* DISCOUNT & SCHEME */}
            {/* ==================================================== */}

            <div className="card shadow mt-3">

                <div className="card-header bg-danger text-white">

                    <h5 className="mb-0">

                        Discount & Scheme

                    </h5>

                </div>

                <div className="card-body">

                    <div className="row">

                        <div className="col-md-3 mb-3">

                            <b>Sale Discount</b>

                            <div>{show(product.SALDIS)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Purchase Discount</b>

                            <div>{show(product.PURDIS)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Sale Special Discount</b>

                            <div>{show(product.SALVDIS)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Purchase Special Discount</b>

                            <div>{show(product.PURSPDIS)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Purchase V. Discount</b>

                            <div>{show(product.PURSPVDIS)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Purchase V. Discount 2</b>

                            <div>{show(product.PURSPVDIS1)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Sale V. Discount</b>

                            <div>{show(product.SALVDIS)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Sale V. Discount 2</b>

                            <div>{show(product.SALVDIS1)} %</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Fixed Discount</b>

                            <div>{show(product.FIXDIS)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Fixed Discount 2</b>

                            <div>{show(product.FIXDIS1)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Free Scheme</b>

                            <div>{show(product.FREE)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Quarter Scheme</b>

                            <div>{show(product.QTRSCHE)}</div>

                        </div>

                        <div className="col-md-3 mb-3">

                            <b>Half Scheme</b>

                            <div>{show(product.HALFSCHE)}</div>

                        </div>

                    </div>

                </div>

            </div>

                        {/* ==================================================== */}
            {/* OTHER INFORMATION */}
            {/* ==================================================== */}

            <div className="card shadow mt-3">

                <div className="card-header bg-secondary text-white">

                    <h5 className="mb-0">

                        Other Information

                    </h5>

                </div>

                <div className="card-body">

                    <div className="row">

                        <div className="col-md-3 mb-3">
                            <b>Product Code</b>
                            <div>{show(product.NAME)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Group Code</b>
                            <div>{show(product.GCODE)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Group Code 2</b>
                            <div>{show(product.GCODE2)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Group Code 3</b>
                            <div>{show(product.GCODE3)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Group Code 4</b>
                            <div>{show(product.GCODE4)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Group Code 5</b>
                            <div>{show(product.GCODE5)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Group Code 6</b>
                            <div>{show(product.GCODE6)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Formula No</b>
                            <div>{show(product.FORMULANO)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Formula Date</b>
                            <div>{show(product.FORMULAFOR)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Claim</b>
                            <div>{show(product.CLAIM)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Claim For</b>
                            <div>{show(product.CLAIMFOR)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Consignment</b>
                            <div>{show(product.CONSIGN)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Misc 1</b>
                            <div>{show(product.MISC1)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Misc 2</b>
                            <div>{show(product.MISC2)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Misc 3</b>
                            <div>{show(product.MISC3)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Misc 4</b>
                            <div>{show(product.MISC4)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Misc 5</b>
                            <div>{show(product.MISC5)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Misc 6</b>
                            <div>{show(product.MISC6)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>Selection</b>
                            <div>{show(product.SELECT)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>IMS Code</b>
                            <div>{show(product.IMSCODE)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>UPC Code</b>
                            <div>{show(product.UPCCODE)}</div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <b>File Name</b>
                            <div>{show(product._vfpFileName)}</div>
                        </div>

                        <div className="col-md-6 mb-3">
                            <b>Last Sync</b>
                            <div>{show(product._vfpSyncedAt)}</div>
                        </div>

                    </div>

                </div>

            </div>

        </>

    );

}