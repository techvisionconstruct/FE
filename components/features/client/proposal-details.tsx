import React, { useState } from "react";
import { ProposalResponse } from "@/types/proposals/dto";

interface ProposalDetailsProps {
  proposal: ProposalResponse;
}

export function ProposalDetails({ proposal }: ProposalDetailsProps) {
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>(
    {}
  );

  return (
    <div className="space-y-12">
      {/* Hero Image */}
      <div className="relative w-full max-w-full h-56 md:h-72 mb-8 overflow-hidden">
        <img
          src={
            proposal?.image ||
            "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b"
          }
          alt={proposal?.name || "Proposal Image"}
          className="w-full h-full object-cover object-center rounded-xl shadow-sm"
        />
      </div>

      {/* Main Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-800">
            {proposal?.name}
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            {proposal?.description}
          </p>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow transition-shadow duration-300">
            <h3 className="text-lg font-semibold mb-5 text-gray-700 flex items-center">
              <span className="h-4 w-1 bg-gray-300 rounded-full mr-3"></span>
              Client Details
            </h3>
            <div className="space-y-4">
              <div className="flex items-center border-b border-gray-50 pb-3">
                <span className="text-sm font-medium w-1/3 text-gray-500">
                  Name:
                </span>
                <span className="text-sm text-gray-700">
                  {proposal?.client_name}
                </span>
              </div>
              <div className="flex items-center border-b border-gray-50 pb-3">
                <span className="text-sm font-medium w-1/3 text-gray-500">
                  Email:
                </span>
                <span className="text-sm text-gray-700">
                  {proposal?.client_email}
                </span>
              </div>
              <div className="flex items-center border-b border-gray-50 pb-3">
                <span className="text-sm font-medium w-1/3 text-gray-500">
                  Phone:
                </span>
                <span className="text-sm text-gray-700">
                  {proposal?.client_phone}
                </span>
              </div>
              <div className="flex items-center pt-1">
                <span className="text-sm font-medium w-1/3 text-gray-500">
                  Address:
                </span>
                <span className="text-sm text-gray-700">
                  {proposal?.client_address}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="font-medium text-sm mb-2 text-gray-500">
                Total Estimate
              </h4>
              <div className="text-3xl font-bold text-gray-800">
                $ {proposal.total_cost}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Variables and Trades */}
      <div className="flex flex-col lg:flex-row gap-10 mb-12">
        {/* Project Variables */}
        {proposal.template?.variables &&
          proposal.template.variables.length > 0 && (
            <div className="lg:w-1/4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sticky top-6">
                <h3 className="text-lg font-semibold mb-6 text-gray-700 flex items-center">
                  <span className="h-4 w-1 bg-gray-300 rounded-full mr-3"></span>
                  Project Variables
                </h3>

                {(() => {
                  // Group variables by variable_type name
                  const groupedVariables: Record<
                    string,
                    typeof proposal.template.variables
                  > = {};
                  proposal.template.variables.forEach((variable) => {
                    const typeName = variable.variable_type?.name || "Other";
                    if (!groupedVariables[typeName]) {
                      groupedVariables[typeName] = [];
                    }
                    groupedVariables[typeName].push(variable);
                  });

                  return (
                    <div className="space-y-8">
                      {Object.entries(groupedVariables).map(
                        ([typeName, variables]) => {
                          const isExpanded = expandedTypes[typeName] || false;
                          const visibleVariables = isExpanded
                            ? variables
                            : variables.slice(0, 5);

                          return (
                            <div
                              key={typeName}
                              className="bg-gray-50 rounded-lg p-5 border border-gray-100"
                            >
                              <h4 className="font-medium text-gray-700 mb-4">
                                {typeName}
                              </h4>

                              <div className="space-y-3">
                                {visibleVariables.map((variable) => (
                                  <div
                                    key={variable.id}
                                    className="bg-white rounded-lg p-3 border border-gray-100 flex justify-between items-center hover:border-gray-300 transition-all duration-200"
                                  >
                                    <span className="text-sm text-gray-600">
                                      {variable.name}
                                    </span>
                                    {variable.value !== undefined && (
                                      <span className="text-sm font-medium bg-gray-50 px-3 py-1.5 rounded-full text-gray-700">
                                        {variable.value}{" "}
                                        {variable.variable_type?.unit}
                                      </span>
                                    )}
                                  </div>
                                ))}

                                {variables.length > 5 && (
                                  <div className="mt-4 text-center">
                                    <button
                                      onClick={() =>
                                        setExpandedTypes((prev) => ({
                                          ...prev,
                                          [typeName]: !isExpanded,
                                        }))
                                      }
                                      className="text-xs font-medium text-gray-600 bg-white px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                      {isExpanded
                                        ? "Show less"
                                        : `+${variables.length - 5} more`}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        {/* Project Scope/Trades */}
        {proposal.template?.trades && proposal.template.trades.length > 0 && (
          <div className="lg:w-3/4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-6 text-gray-700 flex items-center">
                <span className="h-4 w-1 bg-gray-300 rounded-full mr-3"></span>
                Project Scope
              </h3>

              <div className="space-y-10">
                {proposal.template.trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:shadow-sm transition-shadow duration-300"
                  >
                    <div className="flex items-center gap-3 mb-5">
                      {trade.image ? (
                        <div className="h-12 w-12 overflow-hidden rounded-lg">
                          <img
                            src={trade.image}
                            alt={trade.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <div className="h-3 w-3 bg-gray-500 rounded-full"></div>
                        </div>
                      )}
                      <h4 className="font-semibold text-lg text-gray-800">
                        {trade.name}
                      </h4>
                    </div>

                    <p className="text-sm text-gray-600 mb-7 leading-relaxed pl-11">
                      {trade.description}
                    </p>

                    {trade.elements && trade.elements.length > 0 && (
                      <div className="space-y-4 pl-11">
                        {trade.elements.map((element) => {
                          // Calculate total without showing the breakdown
                          const totalCost =
                            Number(element.material_cost || 0) +
                            Number(element.labor_cost || 0);

                          return (
                            <div
                              key={element.id}
                              className="bg-white rounded-lg p-5 border border-gray-100 flex justify-between items-center hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                            >
                              <div className="flex-1 pr-4">
                                <div className="flex items-center gap-3 mb-2">
                                  {element.image ? (
                                    <div className="h-10 w-10 overflow-hidden rounded-lg flex-shrink-0">
                                      <img
                                        src={element.image}
                                        alt={element.name}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : null}
                                  <h5 className="font-medium text-gray-700">
                                    {element.name}
                                  </h5>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                  {element.description}
                                </p>
                              </div>
                              <span className="font-semibold text-base bg-gray-50 px-5 py-2.5 rounded-full text-gray-800 whitespace-nowrap">
                                ${totalCost}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
