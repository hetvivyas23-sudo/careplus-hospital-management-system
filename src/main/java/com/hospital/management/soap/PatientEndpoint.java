package com.hospital.management.soap;

import com.hospital.management.patient.Patient;
import com.hospital.management.patient.PatientRepository;

import org.springframework.ws.server.endpoint.annotation.Endpoint;
import org.springframework.ws.server.endpoint.annotation.PayloadRoot;
import org.springframework.ws.server.endpoint.annotation.RequestPayload;
import org.springframework.ws.server.endpoint.annotation.ResponsePayload;

import org.w3c.dom.Element;
import org.springframework.xml.transform.StringSource;

import javax.xml.transform.Source;

import java.util.Optional;

@Endpoint
public class PatientEndpoint {

    private static final String NAMESPACE =
            "http://hospital.management.com/soap";

    private final PatientRepository patientRepository;

    public PatientEndpoint(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @PayloadRoot(namespace = NAMESPACE, localPart = "getPatientRequest")
    @ResponsePayload
    public Source getPatient(@RequestPayload Element request) {

        String idText = request.getElementsByTagNameNS(
                NAMESPACE, "id").item(0).getTextContent();

        Long id = Long.parseLong(idText);

        Optional<Patient> optionalPatient =
                patientRepository.findById(id);

        if (optionalPatient.isEmpty()) {
            return new StringSource(
                "<getPatientResponse xmlns=\"" + NAMESPACE + "\">" +
                "<id>0</id>" +
                "<name>Patient not found</name>" +
                "<age>0</age>" +
                "<gender></gender>" +
                "<email></email>" +
                "<phone></phone>" +
                "<address></address>" +
                "</getPatientResponse>"
            );
        }

        Patient patient = optionalPatient.get();

        String xml =
            "<getPatientResponse xmlns=\"" + NAMESPACE + "\">" +
            "<id>" + patient.getId() + "</id>" +
            "<name>" + escapeXml(patient.getName()) + "</name>" +
            "<age>" + patient.getAge() + "</age>" +
            "<gender>" + escapeXml(patient.getGender()) + "</gender>" +
            "<email>" + escapeXml(patient.getEmail()) + "</email>" +
            "<phone>" + escapeXml(patient.getPhone()) + "</phone>" +
            "<address>" + escapeXml(patient.getAddress()) + "</address>" +
            "</getPatientResponse>";

        return new StringSource(xml);
    }

    private String escapeXml(String value) {
        if (value == null) {
            return "";
        }

        return value.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&apos;");
    }
}