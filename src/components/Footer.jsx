function Footer() {
    return(
      <footer className="app-footer">
        <div className="container-footer">
            <div>
                <p className="text-muted">Copyright © {new Date().getFullYear()} EBRAINS. All rights reserved.</p>
            </div>
            <div>
                <p className="text-muted"> 
                <a href="https://github.com/mayakobchenko/updated-metadata-wizard/issues/new" target="_blank" rel="noreferrer">Report issue (Github)</a> 
                &nbsp;|&nbsp;
                <a href="mailto:curation-support@ebrains.eu?subject=Metadata Wizard Issue : <Enter short description here>&body=Dear Curation Team,%0D%0A%0D%0A%0D%0A">Report issue (Email)</a> 
                </p>
            </div>
        </div>
      </footer>
    )
  }
  
  export default Footer;