export default function ProjectManagerView({

projects,
projectName,
setProjectName,
createProject,
selectProject,
projectId,
deleteProject,

files,
setFiles,
uploadFiles,
documents,
uploadStatus

}: any){

return(

<div style={box}>

<h2>Project manager</h2>

{/* SELECT PROJECT */}

<div style={section}>



<div style={{marginBottom:20}}>

<div style={{marginBottom:8,fontWeight:600}}>
Select project
</div>

<div style={projectList}>

{projects?.map((p:any)=>(
<div
key={p.id}
onClick={()=>selectProject(p.id)}
style={{
padding:"8px 10px",
background:p.id===projectId ? "#1f2937" : "#111827",
borderBottom:"1px solid #374151",
color:"white",
fontSize:14,
cursor:"pointer"
}}
>
{p.name}
</div>
))}

</div>

</div>

</div>


{/* CREATE PROJECT */}

<div style={section}>

<label>Create project</label>

<input
value={projectName}
onChange={(e)=>setProjectName(e.target.value)}
placeholder="New project name"
style={input}
/>

<button
onClick={createProject}
style={button}
>
Create project
</button>

</div>


{/* DELETE PROJECT */}

{projectId && (

<div style={section}>

<button
onClick={()=>deleteProject(projectId)}
style={dangerButton}
>
Delete current project
</button>

</div>

)}


{/* UPLOAD DOCUMENTS */}

{projectId && (

<div style={section}>

<label>Upload documents</label>

<input
type="file"
multiple
onChange={(e)=>setFiles(e.target.files)}
style={input}
/>

<button
onClick={uploadFiles}
style={button}
>
Upload
</button>

{uploadStatus && (
<div style={statusBox}>
{uploadStatus}
</div>
)}

</div>

)}


{/* DOCUMENT LIST */}

{documents?.length > 0 && (

<div style={section}>

<strong style={{color:"white"}}>Uploaded documents</strong>

{documents.map((doc:any,i:number)=>(

<div key={i} style={{marginTop:5, fontSize:14, color:"white"}}>
• {doc.title}
</div>

))}

</div>

)}

</div>

)

}

const box={
padding:10,
marginTop:10,
color:"white"
}

const section={
marginTop:20
}

const input = {
width:"100%",
padding:"10px 12px",
marginTop:6,
marginBottom:12,
borderRadius:8,
border:"1px solid #374151",
background:"#111827",
color:"white",
boxSizing:"border-box",
appearance:"none",
outline:"none",
fontSize:14,
cursor:"pointer"
};

const button={
width:"100%",
padding:10,
background:"#111528",
color:"white",
border:"1px solid #374151",
borderRadius:6,
cursor:"pointer",
marginTop:8
}

const dangerButton={
width:"100%",
padding:10,
background:"#7f1d1d",
color:"white",
border:"1px solid #ef4444",
borderRadius:6,
cursor:"pointer",
marginTop:10
}

const projectList={
maxHeight:180,
overflowY:"auto",
border:"1px solid #374151",
borderRadius:6
}

const statusBox = {
marginTop:10,
padding:"8px 10px",
background:"#111827",
border:"1px solid #374151",
borderRadius:6,
fontSize:13,
color:"#9ca3af"
}